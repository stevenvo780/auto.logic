#!/usr/bin/env python3
"""
AUTOLOGIC — Fine-tuning Pipeline v2 (Qwen2.5-3B-Instruct)
Trains a LoRA adapter on the distillation dataset to create
a specialised model for propositional logic formalisation.

Target hardware:
  - Primary:  NVIDIA RTX 5070 Ti  (16 GB VRAM, sm_120)
  - Fallback: NVIDIA RTX 2060     ( 6 GB VRAM, sm_75)
  - CPU:      64–128 GB RAM on AMD Ryzen 9 (if no GPU)

Usage (on the tower via SSH):
  python3 02_train.py                  # auto-detect GPU, 3B model
  python3 02_train.py --device cpu     # force CPU (slow but works)
  python3 02_train.py --epochs 20      # override epochs
  python3 02_train.py --model Qwen/Qwen2.5-1.5B-Instruct  # smaller model
"""
import os, sys, argparse, json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

# ── CLI args ────────────────────────────────────
parser = argparse.ArgumentParser(description="Autologic SLM fine-tuning")
parser.add_argument("--model", default="Qwen/Qwen2.5-3B-Instruct",
                    help="HuggingFace model id (default: Qwen/Qwen2.5-3B-Instruct)")
parser.add_argument("--dataset", default=os.path.join(SCRIPT_DIR, "dataset.jsonl"),
                    help="Path to the JSONL training dataset")
parser.add_argument("--epochs", type=int, default=0,
                    help="Override number of epochs (0 = auto based on dataset size)")
parser.add_argument("--batch", type=int, default=1,
                    help="Per-device train batch size (reduce if OOM)")
parser.add_argument("--grad-accum", type=int, default=16,
                    help="Gradient accumulation steps")
parser.add_argument("--lr", type=float, default=2e-4,
                    help="Learning rate")
parser.add_argument("--lora-r", type=int, default=32,
                    help="LoRA rank")
parser.add_argument("--lora-alpha", type=int, default=64,
                    help="LoRA alpha")
parser.add_argument("--max-length", type=int, default=1024,
                    help="Max sequence length for training")
parser.add_argument("--device", default="auto",
                    help="Device: auto, cuda:0, cuda:1, cpu")
parser.add_argument("--output-dir", default=os.path.join(SCRIPT_DIR, "autologic-slm-final"),
                    help="Directory to save the trained model")
parser.add_argument("--resume", action="store_true",
                    help="Resume from last checkpoint")
args = parser.parse_args()

# ── Validate dataset ────────────────────────────
if not os.path.exists(args.dataset):
    sys.exit(f"ERROR: Dataset not found at {args.dataset}\nRun: node 01_dataset_generator.js")

num_samples = sum(1 for _ in open(args.dataset))
print(f"📊 Dataset: {num_samples} samples in {args.dataset}")
if num_samples < 10:
    sys.exit("ERROR: Dataset too small. Need at least 10 samples.")

# ── Imports (after validation to fail fast) ─────
# IMPORTANT: Set CUDA_VISIBLE_DEVICES BEFORE importing torch
# so PyTorch only sees the desired GPU from the start.
if args.device not in ("auto", "cpu") and args.device != "":
    gpu_id = args.device.replace("cuda:", "").replace("cuda", "")
    if gpu_id == "":
        gpu_id = "0"
    os.environ["CUDA_VISIBLE_DEVICES"] = gpu_id
    print(f"🎮 Pre-selecting physical GPU {gpu_id}")
elif args.device == "cpu":
    os.environ["CUDA_VISIBLE_DEVICES"] = ""

print("Loading libraries...")
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig

# ── Device selection ────────────────────────────
if args.device == "auto":
    if torch.cuda.is_available():
        gpu_mem = torch.cuda.get_device_properties(0).total_memory / 1e9
        device_name = torch.cuda.get_device_name(0)
        print(f"🎮 GPU 0: {device_name} ({gpu_mem:.1f} GB)")
        if torch.cuda.device_count() > 1:
            gpu1_name = torch.cuda.get_device_name(1)
            gpu1_mem = torch.cuda.get_device_properties(1).total_memory / 1e9
            print(f"🎮 GPU 1: {gpu1_name} ({gpu1_mem:.1f} GB)")
        device_map = "auto"
    else:
        print("⚠️  No GPU detected. Training on CPU (slow but functional).")
        device_map = "cpu"
elif args.device == "cpu":
    print("⚠️  Forcing CPU training.")
    device_map = "cpu"
else:
    # GPU was pre-selected above, torch sees it as cuda:0
    device_map = "auto"
    if torch.cuda.is_available():
        print(f"🎮 Visible GPU: {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB)")
    else:
        print("⚠️  Selected GPU not available, falling back to CPU.")
        device_map = "cpu"

use_cuda = device_map != "cpu" and torch.cuda.is_available()

# ── Model loading ───────────────────────────────
MODEL_ID = args.model
print(f"📦 Loading model: {MODEL_ID}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# Choose dtype based on hardware
if use_cuda:
    dtype = torch.bfloat16
    print("   dtype: bfloat16 (GPU)")
else:
    dtype = torch.float32
    print("   dtype: float32 (CPU)")

model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=dtype,
    device_map=device_map,
    trust_remote_code=True,
    attn_implementation="eager",  # safe fallback, works everywhere
)
print(f"   Parameters: {model.num_parameters() / 1e6:.1f}M")

# ── LoRA config ─────────────────────────────────
peft_config = LoraConfig(
    r=args.lora_r,
    lora_alpha=args.lora_alpha,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)
print(f"🔧 LoRA: r={args.lora_r}, alpha={args.lora_alpha}, targets=7 modules")

# ── Dataset loading ─────────────────────────────
print("📂 Loading dataset...")
dataset = load_dataset("json", data_files={"train": args.dataset})

def format_chat(example):
    """Apply chat template to convert messages to training text."""
    text = tokenizer.apply_chat_template(example["messages"], tokenize=False)
    return {"text": text}

dataset = dataset.map(format_chat, remove_columns=dataset["train"].column_names)

# Split 5% for eval if dataset is large enough
if num_samples > 100:
    split = dataset["train"].train_test_split(test_size=0.05, seed=42)
    train_dataset = split["train"]
    eval_dataset = split["test"]
    print(f"   Train: {len(train_dataset)} | Eval: {len(eval_dataset)}")
else:
    train_dataset = dataset["train"]
    eval_dataset = None
    print(f"   Train: {len(train_dataset)} | Eval: none (dataset too small)")

# ── Training config ─────────────────────────────
if args.epochs > 0:
    epochs = args.epochs
else:
    # Heuristic: more data = fewer epochs needed
    if num_samples < 200:
        epochs = 20
    elif num_samples < 500:
        epochs = 15
    elif num_samples < 1000:
        epochs = 10
    elif num_samples < 2000:
        epochs = 6
    elif num_samples < 5000:
        epochs = 4
    elif num_samples < 10000:
        epochs = 3
    else:
        epochs = 2  # 10K+ samples: 2 epochs avoids overfitting

checkpoint_dir = os.path.join(SCRIPT_DIR, "autologic-slm-checkpoint")

training_args = SFTConfig(
    output_dir=checkpoint_dir,
    per_device_train_batch_size=args.batch,
    gradient_accumulation_steps=args.grad_accum,
    learning_rate=args.lr,
    num_train_epochs=epochs,
    logging_steps=5,
    save_steps=200,
    save_total_limit=2,
    bf16=use_cuda,
    fp16=False,
    optim="adamw_torch",
    max_length=args.max_length,
    dataset_text_field="text",
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    report_to="none",
    gradient_checkpointing=use_cuda,
    weight_decay=0.01,
    eval_strategy="steps" if eval_dataset else "no",
    eval_steps=100 if eval_dataset else None,
    load_best_model_at_end=bool(eval_dataset),
    metric_for_best_model="eval_loss" if eval_dataset else None,
)

print(f"\n{'='*60}")
print(f"  🏋️  TRAINING CONFIG")
print(f"  Model:    {MODEL_ID}")
print(f"  Samples:  {num_samples}")
print(f"  Epochs:   {epochs}")
print(f"  Batch:    {args.batch} x {args.grad_accum} accum = {args.batch * args.grad_accum} effective")
print(f"  LR:       {args.lr}")
print(f"  MaxLen:   {args.max_length}")
print(f"  Device:   {'GPU' if use_cuda else 'CPU'}")
print(f"  Output:   {args.output_dir}")
print(f"{'='*60}\n")

# ── Train ───────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    peft_config=peft_config,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    args=training_args,
)

if args.resume and os.path.exists(checkpoint_dir):
    print("♻️  Resuming from last checkpoint...")
    trainer.train(resume_from_checkpoint=True)
else:
    print("🚀 Starting training...")
    trainer.train()

# ── Save ────────────────────────────────────────
out_dir = args.output_dir
print(f"\n💾 Saving model to {out_dir}...")
trainer.model.save_pretrained(out_dir)
tokenizer.save_pretrained(out_dir)

# Save training metadata
meta = {
    "base_model": MODEL_ID,
    "dataset": args.dataset,
    "num_samples": num_samples,
    "epochs": epochs,
    "lora_r": args.lora_r,
    "lora_alpha": args.lora_alpha,
    "learning_rate": args.lr,
    "max_length": args.max_length,
    "batch_size_effective": args.batch * args.grad_accum,
    "device": "cuda" if use_cuda else "cpu",
}
with open(os.path.join(out_dir, "training_meta.json"), "w") as f:
    json.dump(meta, f, indent=2)

print("\n✅ Training complete!")
print(f"   Next step: python3 03_export_onnx.py")
