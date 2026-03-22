#!/bin/bash
# AUTOLOGIC: Compresor Final a ONNX (Para ejecución en navegadores)
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Paso 1: Fusionando adaptador LoRA en el modelo base ==="
python3 -c "
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

base_model = AutoModelForCausalLM.from_pretrained('Qwen/Qwen2.5-0.5B', trust_remote_code=True)
model = PeftModel.from_pretrained(base_model, './autologic-slm-final')
m = model.merge_and_unload()
m.save_pretrained('./autologic-slm-merged')
AutoTokenizer.from_pretrained('./autologic-slm-final').save_pretrained('./autologic-slm-merged')
print('✅ Merge completado')
"

echo "=== Paso 2: Exportando a ONNX (fp16) ==="
optimum-cli export onnx \
  -m ./autologic-slm-merged \
  --task text-generation-with-past \
  --dtype fp16 \
  --trust-remote-code \
  --no-post-process \
  ./autologic-slm-onnx

echo "=== Paso 3: Cuantizando a Int8 ==="
python3 -c "
from onnxruntime.quantization import quantize_dynamic, QuantType
import os, glob, shutil

src = './autologic-slm-onnx'
dst = './autologic-slm-onnx-int8'
os.makedirs(dst, exist_ok=True)

# Copy non-onnx files (config, tokenizer, etc.)
for f in glob.glob(os.path.join(src, '*')):
    if not f.endswith('.onnx'):
        bn = os.path.basename(f)
        if os.path.isfile(f):
            shutil.copy2(f, os.path.join(dst, bn))
        elif os.path.isdir(f):
            shutil.copytree(f, os.path.join(dst, bn), dirs_exist_ok=True)

# Quantize each .onnx file
for onnx_file in glob.glob(os.path.join(src, '*.onnx')):
    bn = os.path.basename(onnx_file)
    out = os.path.join(dst, bn)
    print(f'Quantizing {bn}...')
    quantize_dynamic(onnx_file, out, weight_type=QuantType.QInt8)
    print(f'  ✅ {bn} quantizado')

print('✅ Cuantización Int8 completada')
"

echo "=== Resultado ==="
ls -lh ./autologic-slm-onnx-int8/
echo ""
echo "✅ Completado! Modelo en: $SCRIPT_DIR/autologic-slm-onnx-int8/"
