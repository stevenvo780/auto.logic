# 🚀 Destilación de Autologic para la Web

Dado que tienes una máquina de alto nivel (**Ryzen 9 9950X3D + 128GB RAM**), usaremos tu máquina física fuera del ciclo web para crear un modelo neuronal miniaturizado (SLM) que solo entienda nuestra lógica AST. Este modelo se ejecutará nativamente en el navegador de los clientes (o servidores baratos de backend en `EducacionCooperativa`).

## Requisitos Previos en tu máquina anfitriona
1. [Ollama](https://ollama.com/) instalado en local.
2. Un modelo pesado en Ollama (ej. `llama3.1:8b` o `qwen2.5:14b`).
3. Python 3.10+ y Node.js instalados.

## Paso a Paso (Pipeling de Ingenería de Datos a Web)

### 1. Iniciar la Ingenería de Datos Inversa (Ollama)
Crea miles de documentos legales aleatorios partiendo un AST duro, así el mini-modelo aprenderá a extraer el AST sin equivocarse.
En esta carpeta `distillation/`, haz:
```bash
node 01_dataset_generator.js
```
*(Puede tardar unos minutos u horas dependiendo de cuántos `SAMPLES` le pongas).*

### 2. Fine-Tuning al Nano-Modelo (El horno)
Instalas las cosas de IA:
```bash
pip install torch transformers peft datasets trl accelerate optimum[onnxruntime]
```
Inicias el Fine-Tuning:
```bash
python 02_train.py
```
*(Aquí tu 9950X3D exprimirá al Qwen2.5-0.5B hasta que interiorice el formato AST JSON).*

### 3. Factorizar para la Web (ONNX)
Los archivos neuronales `.bin/safetensors` no sirven en Javascript. Exportamos la red neuronal al estandar web `ONNX`.
```bash
./03_export_onnx.sh
```

### 4. Listo para Producción!
La carpeta recién creada `/src/model-web/` ahora contendrá los mágicos `.onnx` int8 de la red neuronal que pesa < 250MB. En la compilación final (NPM) para enviar a `EducacionCooperativa`, `transformers.js` consumirá ese blob y operará autónomamente, sin latencia del servidor, usando WebAssembly/WebGPU.
