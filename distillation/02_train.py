# PIPELINE DE FINE-TUNING PARA AUTOLOGIC (SLM -> Qwen2.5-0.5B)
# Requiere: pip install torch transformers peft datasets trl accelerate

import os
import sys
import torch
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, AutoTokenizer

# Force single GPU to avoid VRAM fragmentation across devices
os.environ["CUDA_VISIBLE_DEVICES"] = "0"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

MODEL_ID = "Qwen/Qwen2.5-0.5B"
DATASET_FILE = os.path.join(SCRIPT_DIR, "dataset.jsonl")

if not os.path.exists(DATASET_FILE):
    sys.exit(f"ERROR: No se encuentra {DATASET_FILE}")

num_samples = sum(1 for _ in open(DATASET_FILE))
print(f"Dataset: {num_samples} muestras en {DATASET_FILE}")

print("Cargando tokenizador y modelo...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# Load in fp16 on GPU
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    dtype=torch.bfloat16,
    device_map="auto",
    trust_remote_code=True,
    attn_implementation="eager",
)

# LoRA config
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj", "k_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

print("Cargando dataset...")
dataset = load_dataset("json", data_files={"train": DATASET_FILE})

def format_chat(example):
    text = tokenizer.apply_chat_template(example["messages"], tokenize=False)
    return {"text": text}

dataset = dataset.map(format_chat, remove_columns=dataset["train"].column_names)

# Dynamically set epochs based on dataset size
epochs = 15 if num_samples < 500 else 8

training_args = SFTConfig(
    output_dir=os.path.join(SCRIPT_DIR, "autologic-slm-checkpoint"),
    per_device_train_batch_size=1,
    gradient_accumulation_steps=8,
    learning_rate=2e-4,
    num_train_epochs=epochs,
    logging_steps=5,
    save_steps=200,
    save_total_limit=2,
    bf16=True,
    optim="adamw_torch",
    max_length=1024,
    dataset_text_field="text",
    warmup_ratio=0.1,
    lr_scheduler_type="cosine",
    report_to="none",
    gradient_checkpointing=True,
    weight_decay=0.01,
)

trainer = SFTTrainer(
    model=model,
    peft_config=peft_config,
    train_dataset=dataset["train"],
    args=training_args,
)

print(f"Iniciando entrenamiento ({epochs} epochs, {num_samples} samples)...")
print(f"GPU: {torch.cuda.get_device_name(0)}")
trainer.train()

out_dir = os.path.join(SCRIPT_DIR, "autologic-slm-final")
print(f"Guardando modelo final en {out_dir}...")
trainer.model.save_pretrained(out_dir)
tokenizer.save_pretrained(out_dir)

print("✅ Entrenamiento completado. Ejecuta 03_export_onnx.sh")
