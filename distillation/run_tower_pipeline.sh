#!/bin/bash
# ═══════════════════════════════════════════════════════
#  AUTOLOGIC — Tower Training Pipeline v2
#  Run this AFTER dataset generation is complete.
#  Stops Ollama, trains 3B model, exports GGUF, restarts.
# ═══════════════════════════════════════════════════════
set -euo pipefail

WORK=~/autologic-distill
VENV=~/autologic-train
LLAMA_CPP=~/llama.cpp

echo "╔══════════════════════════════════════════╗"
echo "║  AUTOLOGIC Tower Pipeline v2             ║"
echo "╚══════════════════════════════════════════╝"

# ── 1. Verify dataset ──────────────────────────
DATASET="$WORK/dataset.jsonl"
if [ ! -f "$DATASET" ]; then
    echo "❌ Dataset not found at $DATASET"
    exit 1
fi
NSAMPLES=$(wc -l < "$DATASET")
echo "📊 Dataset: $NSAMPLES samples"
if [ "$NSAMPLES" -lt 100 ]; then
    echo "❌ Dataset too small ($NSAMPLES < 100)"
    exit 1
fi

# ── 2. Stop Ollama to free GPU VRAM ────────────
echo ""
echo "🔄 Stopping Ollama to free GPU VRAM..."
# Try systemd first, then direct kill
systemctl --user stop ollama 2>/dev/null || \
    sudo systemctl stop ollama 2>/dev/null || \
    pkill -f ollama 2>/dev/null || \
    echo "⚠️  Could not stop Ollama (may not be running)"
sleep 3
echo "  GPU state after stopping Ollama:"
nvidia-smi --query-gpu=name,memory.used,memory.free --format=csv,noheader

# ── 3. Train ───────────────────────────────────
echo ""
echo "🏋️ Starting training..."
source "$VENV/bin/activate"
cd "$WORK"

# Clean previous run
rm -rf autologic-slm-final autologic-slm-checkpoint autologic-slm-merged

python3 02_train.py \
    --dataset "$DATASET" \
    --model Qwen/Qwen2.5-3B-Instruct \
    --device cuda:0 \
    --batch 1 \
    --grad-accum 16 \
    --max-length 1024 \
    --lora-r 32 \
    --lora-alpha 64 \
    2>&1 | tee training_v2.log

if [ ! -d "$WORK/autologic-slm-final" ]; then
    echo "❌ Training failed - no output directory"
    exit 1
fi

# ── 4. Merge LoRA + Convert to GGUF ───────────
echo ""
echo "📦 Merging LoRA into base model..."
python3 -c "
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base = AutoModelForCausalLM.from_pretrained(
    'Qwen/Qwen2.5-3B-Instruct',
    torch_dtype=torch.float16,
    trust_remote_code=True,
)
model = PeftModel.from_pretrained(base, '$WORK/autologic-slm-final')
merged = model.merge_and_unload()
merged.save_pretrained('$WORK/autologic-slm-merged')
AutoTokenizer.from_pretrained('$WORK/autologic-slm-final').save_pretrained('$WORK/autologic-slm-merged')
print('✅ Merge complete')
del merged, model, base
torch.cuda.empty_cache()
"

echo ""
echo "🔄 Converting to GGUF Q8_0..."
python3 "$LLAMA_CPP/convert_hf_to_gguf.py" \
    "$WORK/autologic-slm-merged" \
    --outtype q8_0 \
    --outfile "$WORK/autologic-3b-q8.gguf"

GGUF_SIZE=$(du -sh "$WORK/autologic-3b-q8.gguf" | cut -f1)
echo "  ✅ GGUF created: $GGUF_SIZE"

# ── 5. Register in Ollama ──────────────────────
echo ""
echo "📝 Creating Ollama Modelfile..."
cat > "$WORK/Modelfile" << 'MODELFILE'
FROM ./autologic-3b-q8.gguf

TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>
"""

PARAMETER stop "<|im_end|>"
PARAMETER stop "<|im_start|>"
PARAMETER temperature 0.1
PARAMETER top_p 0.9
PARAMETER num_predict 2048
MODELFILE

# ── 6. Restart Ollama and register model ───────
echo ""
echo "🔄 Restarting Ollama..."
systemctl --user start ollama 2>/dev/null || \
    sudo systemctl start ollama 2>/dev/null || \
    nohup ollama serve > /dev/null 2>&1 &
sleep 5

echo "📦 Registering model in Ollama..."
cd "$WORK"
ollama create autologic-formalizer-3b -f Modelfile
echo "  ✅ Model registered as autologic-formalizer-3b"

# ── 7. Quick smoke test ────────────────────────
echo ""
echo "🧪 Running smoke test..."
RESULT=$(curl -s http://localhost:11434/api/chat -d '{
  "model": "autologic-formalizer-3b",
  "messages": [
    {"role": "system", "content": "You are Autologic semantic AST parser. Return ONLY pure JSON: {\"axioms\":[{\"name\":\"a1\",\"formulaJSON\":<LogicNode>}],\"conclusions\":[{\"formulaJSON\":<LogicNode>}]}. AtomNode: {\"type\":\"Atom\",\"id\":\"SCREAMING_SNAKE_CASE\",\"text\":\"description\"}. ConnectiveNode: {\"type\":\"Connective\",\"operator\":\"AND\"|\"OR\"|\"IMPLIES\"|\"IFF\"|\"NOT\",\"left\":<node>,\"right\":<node>}. For NOT: {\"type\":\"Connective\",\"operator\":\"NOT\",\"left\":<child>}."},
    {"role": "user", "content": "Formalize this text:\n\nSi llueve, entonces la calle se moja. Llueve. Por lo tanto, la calle se moja."}
  ],
  "stream": false,
  "format": "json",
  "options": {"temperature": 0.1}
}')

echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
content = d.get('message', {}).get('content', 'NO CONTENT')
try:
    j = json.loads(content)
    has_axioms = 'axioms' in j and len(j['axioms']) > 0
    has_conclusions = 'conclusions' in j and len(j['conclusions']) > 0
    print(f'  JSON: ✅ valid')
    print(f'  Axioms: {len(j.get(\"axioms\",[]))} | Conclusions: {len(j.get(\"conclusions\",[]))}')
    if has_axioms and has_conclusions:
        print('  🎯 SMOKE TEST PASSED')
    else:
        print('  ⚠️  Missing axioms or conclusions')
except:
    print(f'  ❌ Invalid JSON: {content[:200]}')
"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  ✅ PIPELINE COMPLETE                    ║"
echo "║  Model: autologic-formalizer-3b          ║"
echo "║  GGUF:  $WORK/autologic-3b-q8.gguf      ║"
echo "╚══════════════════════════════════════════╝"
