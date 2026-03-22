#!/bin/bash
# Upload Autologic SLM ONNX model to HuggingFace
# Usage: HF_TOKEN=hf_xxx ./upload_to_hf.sh
# Or:    huggingface-cli login first, then ./upload_to_hf.sh

set -euo pipefail

REPO_ID="stevenvo780/autologic-slm-onnx"
MODEL_DIR="$HOME/autologic-train/autologic-slm-onnx-fp32-cache"

if [ ! -d "$MODEL_DIR" ]; then
    echo "ERROR: Model dir not found: $MODEL_DIR"
    exit 1
fi

echo "=== Uploading to HuggingFace: $REPO_ID ==="
echo "Model dir: $MODEL_DIR"
echo "Files:"
ls -lh "$MODEL_DIR"

source ~/autologic-train/venv/bin/activate

python3 << PYEOF
from huggingface_hub import HfApi, create_repo
import os

repo_id = "$REPO_ID"
model_dir = "$MODEL_DIR"
token = os.environ.get("HF_TOKEN", None)

api = HfApi(token=token)

# Create repo (or skip if exists)
try:
    create_repo(repo_id, repo_type="model", exist_ok=True, token=token)
    print(f"Repo {repo_id} ready")
except Exception as e:
    print(f"Repo creation note: {e}")

# Upload all files
print("Uploading model files...")
api.upload_folder(
    folder_path=model_dir,
    repo_id=repo_id,
    repo_type="model",
    commit_message="Autologic SLM 0.5B - Qwen2.5 LoRA fine-tuned, ONNX fp32 with KV cache",
)
print(f"Done! Model available at: https://huggingface.co/{repo_id}")
PYEOF
