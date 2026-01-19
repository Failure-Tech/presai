from transformers import AutoProcessor, AutoModelForImageTextToText
import torch
import json
import os

def clean_response(text):
    """Remove the User: prompt and Assistant: label from generated text"""
    if "Assistant:" in text:
        return text.split("Assistant:")[-1].strip()
    return text

device = "cuda" if torch.cuda.is_available() else "cpu"

# Load the model
processor = AutoProcessor.from_pretrained("HuggingFaceTB/SmolVLM-Instruct")
try:
    model = AutoModelForImageTextToText.from_pretrained(
        "HuggingFaceTB/SmolVLM-Instruct",
        torch_dtype = torch.float16 if device == "cuda" else torch.float32,
        _attn_implementation="flash_attention_2" if device == "cuda" else "eager"
    ).to(device)
except ImportError:
    print("Flash Attention 2 not available, using eager attention instead...")
    model = AutoModelForImageTextToText.from_pretrained(
        "HuggingFaceTB/SmolVLM-Instruct",
        torch_dtype = torch.float16 if device == "cuda" else torch.float32,
        _attn_implementation="eager"
    ).to(device)

# Path to video and transcript
video_path = r"C:\Users\yongg\OneDrive\Documents\GitHub\presai\bodycam-analysis\frontend\public\bodycam_detected.mp4"
transcript_path = r"C:\Users\yongg\OneDrive\Documents\GitHub\presai\bodycam-analysis\frontend\public\labeled_transcript.json"

# Load transcript
with open(transcript_path, 'r') as f:
    transcript = json.load(f)

# Extract key information from transcript
transcript_text = " ".join([entry["text"] for entry in transcript])
speakers = set([entry["speaker"] for entry in transcript])
key_phrases = []
for entry in transcript:
    if any(keyword in entry["text"].lower() for keyword in ["check", "damage", "camera", "officer", "incident", "call", "request"]):
        key_phrases.append({
            "time": entry["start"],
            "text": entry["text"]
        })

# Analyze video with context from transcript
messages = [
    {
        "role": "user",
        "content": [
            {"type": "video", "path": video_path},
            {"type": "text", "text": f"Analyze this body camera footage. Context from transcript: {transcript_text[:500]}... What is the scene, key events, and important observations?"},
        ],
    }
]

inputs = processor.apply_chat_template(
    messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt"
)

# Move inputs to the same device as the model
inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in inputs.items()}

generated_ids = model.generate(**inputs, do_sample=False, max_new_tokens=200)
generated_texts = processor.batch_decode(
    generated_ids,
    skip_special_tokens=True
)

scene_analysis = clean_response(generated_texts[0])

# Generate key events synthesis
events_messages = [
    {
        "role": "user",
        "content": [
            {"type": "video", "path": video_path},
            {"type": "text", "text": "List the main events and significant moments in this body camera footage in chronological order."},
        ],
    }
]

events_inputs = processor.apply_chat_template(
    events_messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt"
)

# Move inputs to the same device as the model
events_inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in events_inputs.items()}

events_ids = model.generate(**events_inputs, do_sample=False, max_new_tokens=150)
key_events = clean_response(processor.batch_decode(
    events_ids,
    skip_special_tokens=True
)[0])

# Generate context/details
context_messages = [
    {
        "role": "user",
        "content": [
            {"type": "video", "path": video_path},
            {"type": "text", "text": "What important details, identifiable information, or context can you see in this body camera footage?"},
        ],
    }
]

context_inputs = processor.apply_chat_template(
    context_messages,
    add_generation_prompt=True,
    tokenize=True,
    return_dict=True,
    return_tensors="pt"
)

# Move inputs to the same device as the model
context_inputs = {k: v.to(device) if isinstance(v, torch.Tensor) else v for k, v in context_inputs.items()}

context_ids = model.generate(**context_inputs, do_sample=False, max_new_tokens=150)
context = clean_response(processor.batch_decode(
    context_ids,
    skip_special_tokens=True
)[0])

# Compile reasoning output
reasoning_output = {
    "sceneAnalysis": scene_analysis,
    "keyEvents": key_events,
    "context": context,
    "transcriptSummary": {
        "totalDuration": transcript[-1]["end"] if transcript else 0,
        "speakers": list(speakers),
        "keyPhrases": key_phrases[:10]  # Top 10 key phrases
    }
}

# Output to JSON file for frontend
script_dir = os.path.dirname(os.path.abspath(__file__))
output_path = os.path.join(script_dir, "../frontend/public/ai_reasoning.json")
output_path = os.path.abspath(output_path)

# Ensure output directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w') as f:
    json.dump(reasoning_output, f, indent=2)

print(f"AI Reasoning analysis saved to {output_path}")
print(json.dumps(reasoning_output, indent=2))