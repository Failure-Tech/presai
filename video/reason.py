from transformers import AutoProcessor, AutoModelForImageTextToText
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"

processor = AutoProcessor.from_pretrained("HuggingFaceTB/SmolVLM-Instruct")
model = AutoModelForImageTextToText.from_pretrained(
    "HuggingFaceTB/SmolVLM-Instruct",
    torch_dtype = torch.bfloat16,
    _attn_implementation="flash_attention_2" if device == "cuda" else "eager"
).to(device)

messages = [
    {
        "role": "user",
        "content": [
            {"type": "video", "path": "./data/body_cam_model_test.mp4"},
            {"type": "text", "text": "Describe what is going on in this body camera footage from this police officer."},
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

generated_ids = model.generate(**inputs, do_sample=False, max_new_tokens=64)
generated_texts = processor.batch_decode(
    generated_ids,
    skip_special_tokens=True
)

print(generated_texts[0])