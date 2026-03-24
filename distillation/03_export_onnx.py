#!/usr/bin/env python3
"""
AUTOLOGIC — Export fine-tuned LoRA model to ONNX (quantised int8)

Steps:
  1. Merge LoRA adapter into base model
  2. Export to ONNX via optimum-cli
  3. Quantise to int8
  4. Copy final model to ../src/model-web/

Usage:
  python3 03_export_onnx.py
  python3 03_export_onnx.py --base Qwen/Qwen2.5-0.5B-Instruct  # if you trained a different base
  python3 03_export_onnx.py --skip-quantize   # keep fp16
  python3 03_export_onnx.py --no-deploy       # don't copy to model-web
"""
import os, sys, shutil, glob, argparse, subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(SCRIPT_DIR)

parser = argparse.ArgumentParser(description="Export LoRA model to ONNX")
parser.add_argument("--base", default="Qwen/Qwen2.5-3B-Instruct",
                    help="Base model id used during training")
parser.add_argument("--adapter", default=os.path.join(SCRIPT_DIR, "autologic-slm-final"),
                    help="Path to LoRA adapter directory")
parser.add_argument("--skip-quantize", action="store_true",
                    help="Skip int8 quantisation (keep fp16)")
parser.add_argument("--no-deploy", action="store_true",
                    help="Don't copy to src/model-web/")
args = parser.parse_args()

MERGED_DIR = os.path.join(SCRIPT_DIR, "autologic-slm-merged")
ONNX_DIR   = os.path.join(SCRIPT_DIR, "autologic-slm-onnx")
INT8_DIR   = os.path.join(SCRIPT_DIR, "autologic-slm-onnx-int8")
DEPLOY_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "src", "model-web"))

# ── Step 1: Merge LoRA ──────────────────────────
print("=" * 60)
print("  STEP 1: Merging LoRA adapter into base model")
print("=" * 60)

if not os.path.exists(args.adapter):
    sys.exit(f"ERROR: Adapter not found at {args.adapter}\nRun 02_train.py first.")

from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

print(f"  Base:    {args.base}")
print(f"  Adapter: {args.adapter}")
print(f"  Output:  {MERGED_DIR}")

base_model = AutoModelForCausalLM.from_pretrained(
    args.base,
    torch_dtype=torch.float16,
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(base_model, args.adapter)
merged = model.merge_and_unload()
merged.save_pretrained(MERGED_DIR)
AutoTokenizer.from_pretrained(args.adapter).save_pretrained(MERGED_DIR)
print("  ✅ Merge complete")

# Free memory
del merged, model, base_model
if torch.cuda.is_available():
    torch.cuda.empty_cache()

# ── Step 2: Export to ONNX ──────────────────────
print("\n" + "=" * 60)
print("  STEP 2: Exporting to ONNX (fp16)")
print("=" * 60)

if os.path.exists(ONNX_DIR):
    shutil.rmtree(ONNX_DIR)

cmd = [
    sys.executable, "-m", "optimum.exporters.onnx",
    "--model", MERGED_DIR,
    "--task", "text-generation-with-past",
    "--dtype", "fp16",
    "--trust-remote-code",
    "--no-post-process",
    ONNX_DIR,
]
print(f"  Running: {' '.join(cmd)}")
result = subprocess.run(cmd, capture_output=False)
if result.returncode != 0:
    # Fallback: try without --dtype flag (some optimum versions don't support it)
    print("  ⚠️  Retrying without --dtype flag...")
    cmd_fallback = [x for x in cmd if x != "--dtype" and x != "fp16"]
    result = subprocess.run(cmd_fallback, capture_output=False)
    if result.returncode != 0:
        sys.exit("ERROR: ONNX export failed")

# Verify output
onnx_files = glob.glob(os.path.join(ONNX_DIR, "*.onnx*"))
if not onnx_files:
    sys.exit(f"ERROR: No ONNX files found in {ONNX_DIR}")

onnx_size = sum(os.path.getsize(f) for f in onnx_files) / (1024**3)
print(f"  ✅ ONNX export complete ({onnx_size:.2f} GB)")

# ── Step 3: Quantise to int8 ────────────────────
if not args.skip_quantize:
    print("\n" + "=" * 60)
    print("  STEP 3: Quantising to int8")
    print("=" * 60)

    from onnxruntime.quantization import quantize_dynamic, QuantType

    if os.path.exists(INT8_DIR):
        shutil.rmtree(INT8_DIR)
    os.makedirs(INT8_DIR, exist_ok=True)

    # Copy non-ONNX files (config, tokenizer, etc.)
    for f in glob.glob(os.path.join(ONNX_DIR, "*")):
        basename = os.path.basename(f)
        if not basename.endswith(".onnx") and not basename.endswith(".onnx_data"):
            if os.path.isfile(f):
                shutil.copy2(f, os.path.join(INT8_DIR, basename))

    # Quantise each ONNX model file
    onnx_models = glob.glob(os.path.join(ONNX_DIR, "*.onnx"))
    for onnx_path in onnx_models:
        basename = os.path.basename(onnx_path)
        out_path = os.path.join(INT8_DIR, basename)
        print(f"  Quantising {basename}...")
        try:
            quantize_dynamic(
                onnx_path,
                out_path,
                weight_type=QuantType.QInt8,
            )
        except Exception as e:
            print(f"  ⚠️  Quantisation failed for {basename}: {e}")
            print(f"      Copying fp16 version instead.")
            shutil.copy2(onnx_path, out_path)
            # Also copy the data file if exists
            data_file = onnx_path + "_data"
            if os.path.exists(data_file):
                shutil.copy2(data_file, out_path + "_data")

    int8_files = glob.glob(os.path.join(INT8_DIR, "*.onnx*"))
    int8_size = sum(os.path.getsize(f) for f in int8_files) / (1024**3)
    print(f"  ✅ Quantisation complete ({int8_size:.2f} GB)")
    final_dir = INT8_DIR
else:
    final_dir = ONNX_DIR

# ── Step 4: Deploy to model-web ─────────────────
if not args.no_deploy:
    print("\n" + "=" * 60)
    print("  STEP 4: Deploying to src/model-web/")
    print("=" * 60)

    if os.path.exists(DEPLOY_DIR):
        # Backup existing
        backup = DEPLOY_DIR + ".bak"
        if os.path.exists(backup):
            shutil.rmtree(backup)
        shutil.move(DEPLOY_DIR, backup)
        print(f"  📦 Backed up existing model to {backup}")

    shutil.copytree(final_dir, DEPLOY_DIR)

    # Verify deployment
    deployed_files = glob.glob(os.path.join(DEPLOY_DIR, "**/*"), recursive=True)
    deployed_size = sum(os.path.getsize(f) for f in deployed_files if os.path.isfile(f)) / (1024**3)
    print(f"  ✅ Deployed to {DEPLOY_DIR} ({deployed_size:.2f} GB)")

# ── Summary ─────────────────────────────────────
print("\n" + "=" * 60)
print("  ✅ EXPORT PIPELINE COMPLETE")
print("=" * 60)
print(f"  Merged model: {MERGED_DIR}")
print(f"  ONNX fp16:    {ONNX_DIR}")
if not args.skip_quantize:
    print(f"  ONNX int8:    {INT8_DIR}")
if not args.no_deploy:
    print(f"  Deployed to:  {DEPLOY_DIR}")
print(f"\n  Next: run your tests to verify quality")
print(f"  cd .. && npx vitest run tests/propositional-exercises.test.ts")
