#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  AUTOLOGIC — Multi-Ollama Setup for pc-stev (torre)
#  Launches 3 Ollama instances pinned to different hardware:
#    Port 11434: GPU 0 (RTX 5070 Ti) → qwen2.5-coder:14b
#    Port 11435: GPU 1 (RTX 2060)    → qwen2.5-coder:7b
#    Port 11436: CPU only (128GB RAM) → qwen2.5:72b
# ═══════════════════════════════════════════════════════════
set -euo pipefail

TOWER="stev@10.88.88.1"

echo "╔══════════════════════════════════════════════════════╗"
echo "║  Multi-Ollama Setup for Dataset Generation          ║"
echo "╚══════════════════════════════════════════════════════╝"

# Stop the main Ollama service first
echo "🔄 Stopping main Ollama service..."
ssh "$TOWER" 'sudo systemctl stop ollama 2>/dev/null; sleep 2; pkill -f "ollama serve" 2>/dev/null || true; sleep 1'
echo "   ✅ Ollama stopped"

# Verify GPU state
echo ""
echo "🖥️  GPU state:"
ssh "$TOWER" 'nvidia-smi --query-gpu=index,name,memory.free --format=csv,noheader'

# Launch 3 instances
echo ""
echo "🚀 Launching 3 Ollama instances..."

# Instance 1: GPU 0 (RTX 5070 Ti, 16GB) — port 11434
echo "   [1] Port 11434 → GPU 0 (RTX 5070 Ti) → qwen2.5-coder:14b"
ssh "$TOWER" 'bash -c "
  nohup env CUDA_VISIBLE_DEVICES=0 \
    OLLAMA_HOST=0.0.0.0:11434 \
    OLLAMA_MODELS=/datos/ollama/models \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_NUM_PARALLEL=2 \
    OLLAMA_KEEP_ALIVE=24h \
    /usr/local/bin/ollama serve > /tmp/ollama_gpu0.log 2>&1 &
  echo \$!"'
sleep 3

# Instance 2: GPU 1 (RTX 2060, 6GB) — port 11435
echo "   [2] Port 11435 → GPU 1 (RTX 2060) → qwen2.5-coder:7b"
ssh "$TOWER" 'bash -c "
  nohup env CUDA_VISIBLE_DEVICES=1 \
    OLLAMA_HOST=0.0.0.0:11435 \
    OLLAMA_MODELS=/datos/ollama/models \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_NUM_PARALLEL=2 \
    OLLAMA_KEEP_ALIVE=24h \
    /usr/local/bin/ollama serve > /tmp/ollama_gpu1.log 2>&1 &
  echo \$!"'
sleep 3

# Instance 3: CPU only (128GB RAM) — port 11436
echo "   [3] Port 11436 → CPU only (RAM) → qwen2.5:72b"
ssh "$TOWER" 'bash -c "
  nohup env CUDA_VISIBLE_DEVICES=\"\" \
    OLLAMA_HOST=0.0.0.0:11436 \
    OLLAMA_MODELS=/datos/ollama/models \
    OLLAMA_MAX_LOADED_MODELS=1 \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_KEEP_ALIVE=24h \
    /usr/local/bin/ollama serve > /tmp/ollama_cpu.log 2>&1 &
  echo \$!"'
sleep 3

# Verify all instances are running
echo ""
echo "🔍 Verifying instances..."
for port in 11434 11435 11436; do
  if ssh "$TOWER" "curl -sf http://localhost:$port/api/tags > /dev/null 2>&1"; then
    echo "   ✅ Port $port: OK"
  else
    echo "   ❌ Port $port: FAILED"
  fi
done

# Preload models (warm up)
echo ""
echo "🔥 Preloading models (this may take a moment)..."

echo "   Loading qwen2.5-coder:14b on GPU 0..."
ssh "$TOWER" 'curl -sf -X POST http://localhost:11434/api/generate \
  -d "{\"model\":\"qwen2.5-coder:14b\",\"prompt\":\"hi\",\"stream\":false,\"options\":{\"num_predict\":1}}" > /dev/null 2>&1' &
PID1=$!

echo "   Loading qwen2.5-coder:7b on GPU 1..."
ssh "$TOWER" 'curl -sf -X POST http://localhost:11435/api/generate \
  -d "{\"model\":\"qwen2.5-coder:7b\",\"prompt\":\"hi\",\"stream\":false,\"options\":{\"num_predict\":1}}" > /dev/null 2>&1' &
PID2=$!

echo "   Loading qwen2.5:72b on CPU (takes longer)..."
ssh "$TOWER" 'curl -sf -X POST http://localhost:11436/api/generate \
  -d "{\"model\":\"qwen2.5:72b\",\"prompt\":\"hi\",\"stream\":false,\"options\":{\"num_predict\":1,\"num_gpu\":0}}" > /dev/null 2>&1' &
PID3=$!

wait $PID1 && echo "   ✅ 14b loaded" || echo "   ⚠️  14b load issue"
wait $PID2 && echo "   ✅ 7b loaded" || echo "   ⚠️  7b load issue"
wait $PID3 && echo "   ✅ 72b loaded" || echo "   ⚠️  72b load issue"

# Final status
echo ""
echo "📊 Final GPU state:"
ssh "$TOWER" 'nvidia-smi --query-gpu=index,name,memory.used,memory.free --format=csv,noheader'
echo ""
echo "📊 RAM usage:"
ssh "$TOWER" 'free -h | head -2'
echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ Multi-Ollama ready!"
echo "   GPU 0: http://10.88.88.1:11434  (qwen2.5-coder:14b)"
echo "   GPU 1: http://10.88.88.1:11435  (qwen2.5-coder:7b)"
echo "   CPU:   http://10.88.88.1:11436  (qwen2.5:72b)"
echo "═══════════════════════════════════════════════════════"
