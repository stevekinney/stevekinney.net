---
title: Fine-Tuning Transformer Models
description: >-
  Prepare datasets, choose an approach (full, LoRA/PEFT), configure training
  with the Trainer API, evaluate, and ship safely to production.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T20:03:50.784Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Clean, well-labeled data matters most; tokenize with the exact model tokenizer
> - Choose full FT for capacity or LoRA/PEFT for efficiency and adapter reuse
> - Configure Trainer: batch sizes, LR/warmup, weight decay, precision, eval strategy
> - Use early stopping, checkpointing, and pinned revisions for reproducibility
> - Productionize with safe decoding defaults, observability, and versioning

## Overview

Fine-tuning adapts a pre-trained model to your domain or task using labeled examples, improving accuracy and style adherence. You can update all weights (full fine-tuning) or apply parameter-efficient methods like LoRA/PEFT to reduce compute and VRAM requirements. This process is like teaching a knowledgeable student a specific skill—the pre-trained model already understands language patterns, and we're teaching it to apply that knowledge to our specific task.

## Notebook

View the companion notebook: [Fine Tuning](https://colab.research.google.com/drive/1obIENeCQ1NqIe2CK7hgB-s4X0G29T-BV?usp=sharing)

## What is Fine-Tuning?

Fine-tuning takes a model that has already learned general language understanding from massive datasets and specializes it for your specific needs. The base model has learned patterns, grammar, and knowledge from training on huge portions of the internet. Fine-tuning teaches it to apply this knowledge to your task.

## Why Fine-Tune?

**Task-specific performance**: Pre-trained models are general-purpose; fine-tuning makes them experts at your task. **Domain adaptation**: Adapt models to specific domains (medical, legal, technical). **Data efficiency**: Requires much less data than training from scratch. **Time efficiency**: Much faster than pre-training a model.

## Setting Up for Fine-Tuning

First, install the necessary libraries:

```python
!pip install transformers datasets accelerate bitsandbytes -q

import pprint
import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    BitsAndBytesConfig,
    DataCollatorForLanguageModeling,
    TrainingArguments,
    Trainer,
    pipeline,
    logging
)
from datasets import load_dataset
import peft

# Suppress verbose output
logging.set_verbosity_error()
print("🤘 The setup is complete.")
```

## Data Preparation

The quality and format of your training data are the most important factors for successful fine-tuning. For our example, we'll teach a model to generate quotes:

```python
# Load the dataset
dataset_name = "Abirate/english_quotes"
dataset = load_dataset(dataset_name, split="train")

print(dataset)
# Dataset({
#     features: ['quote', 'author', 'tags'],
#     num_rows: 2508
# })

# Format data for our task
def format_prompt(example):
    quote_text = example['quote']
    author_name = example['author']
    return {"text": f"Quote by {author_name}: {quote_text} <|endoftext|>"}

formatted_dataset = dataset.map(format_prompt)

# Example formatted text
print(formatted_dataset[0]['text'])
# Quote by Oscar Wilde: "Be yourself; everyone else is already taken." <|endoftext|>
```

The `<|endoftext|>` token is crucial—it teaches the model when a quote is finished, so it learns to stop generating at the right time.

## Loading the Pre-Trained Model

We'll use quantization to make the model memory-efficient. This allows us to fine-tune larger models on limited hardware:

```python
model_name = "gpt2-medium"

# Quantization configuration to load the model in 4-bit
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.float16,
)

def get_model():
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        trust_remote_code=True
    )
    model.config.use_cache = False
    return model

# Load the tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
```

Think of quantization as creating a summary of a very long book. Instead of using rich, detailed vocabulary (32-bit floating point), we use a more limited, efficient set of words (4-bit integers) to capture the main ideas.

## Parameter-Efficient Fine-Tuning (PEFT)

PEFT is a family of techniques for customizing large models without touching all of their original weights. Instead of re-training hundreds of millions of parameters, PEFT methods freeze the base model and learn only a tiny add-on.

### What is LoRA?

Low-Rank Adaptation (LoRA) freezes the original weights and learns two tiny matrices whose product has very low rank. During training, only these add-on matrices are updated, storing and multiplying far fewer parameters—often hundreds of times less than a full fine-tune.

```python
data_collator = DataCollatorForLanguageModeling(
    tokenizer=tokenizer,
    mlm=False
)

# Configure LoRA
lora_config = peft.LoraConfig(
    r=8,  # Rank of the update matrices
    lora_alpha=32,  # Scaling factor for the LoRA weights
    lora_dropout=0.05,  # Dropout probability for LoRA layers
    bias="none",  # Bias type
    task_type="CAUSAL_LM",  # Task type
    fan_in_fan_out=True,
)

# Add LoRA adapters to the model
model = peft.get_peft_model(get_model(), lora_config)
model.print_trainable_parameters()
# trainable params: 786,432 || all params: 355,609,600 || trainable%: 0.2212
```

We're training less than 1% of the model's parameters! This is why LoRA is so efficient.

## Tokenizing the Dataset

Convert our formatted text into token IDs:

```python
def tokenize_function(examples):
    return tokenizer(
        examples['text'],
        padding="max_length",
        truncation=True,
        max_length=128
    )

# Tokenize the entire dataset
tokenized_dataset = formatted_dataset.map(tokenize_function, batched=True)

pprint.pp(tokenized_dataset[0], compact=True)
```

## The Fine-Tuning Process

Use the Trainer API from Hugging Face to handle the entire training loop:

```python
# Define training arguments
training_args = TrainingArguments(
    output_dir="./gpt2-medium-quotes",
    num_train_epochs=1,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=1,
    learning_rate=2e-4,
    fp16=True,  # Mixed precision for faster training
    logging_steps=200,
    save_total_limit=2,
    report_to="none"
)

# Create the Trainer instance
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset,
    data_collator=data_collator
)

# Start fine-tuning!
print("🚀 Starting fine-tuning…")
trainer.train()
print("✅ Fine-tuning complete!")

# Save the final model
final_model_dir = "./gpt2-medium-quotes-final"
trainer.save_model(final_model_dir)
```

## Training Arguments Explained

**`learning_rate`**: Think of this as how big of a step the student takes when correcting a mistake. Too big (>5e-5), and they might overshoot. Too small (<1e-6), and it takes forever to learn.

**`per_device_train_batch_size`**: How many examples to show before updating understanding. It's more efficient than showing one example at a time.

**`num_train_epochs`**: How many times to go through the entire dataset. More epochs can improve learning but risk overfitting.

**`fp16`**: Use mixed precision for faster training and lower memory usage.

## Testing the Fine-Tuned Model

Compare the base model against our fine-tuned version:

```python
from peft import PeftModel

prompt = "Quote by Jimi Hendrix"

# Test the original base model
print("--- Testing the Original Base Model ---")
base_generator = pipeline('text-generation', model="gpt2-medium", tokenizer="gpt2-medium")
result = base_generator(prompt, max_length=50, num_return_sequences=1)
print("Base model response:")
print(result[0]['generated_text'])

# Test our fine-tuned model
print("\n--- Testing Our Fine-Tuned Model ---")
base_model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    low_cpu_mem_usage=True
)
fine_tuned_model = PeftModel.from_pretrained(base_model, final_model_dir)
fine_tuned_model = fine_tuned_model.merge_and_unload()

fine_tuned_generator = pipeline(
    'text-generation',
    model=fine_tuned_model,
    tokenizer=tokenizer
)
result = fine_tuned_generator(prompt, max_length=50, num_return_sequences=1)
print("Fine-tuned model response:")
print(result[0]['generated_text'])
```

You should see a dramatic difference. The base model likely generates something generic or unrelated, while the fine-tuned model immediately generates a plausible quote following the structure it learned.

## Approaches to Fine-Tuning

### Full Fine-Tuning

Updates all model weights. Provides highest capacity but is most expensive:

```python
# Full fine-tuning (without LoRA)
model = AutoModelForCausalLM.from_pretrained(model_name)
# All parameters are trainable
```

### LoRA/PEFT

Injects low-rank adapters, training 10-100× fewer parameters:

```python
lora_config = peft.LoraConfig(
    r=8,  # Lower rank = fewer parameters
    lora_alpha=16,  # Scaling factor
    target_modules=["c_attn"],  # Which layers to adapt
    lora_dropout=0.05
)
```

### Layer Freezing

Freeze lower layers to save compute:

```python
# Freeze all but the last two transformer blocks
for param in model.transformer.h[:-2].parameters():
    param.requires_grad = False
```

## Evaluation Metrics

Monitor these metrics during training:

**Classification**: Accuracy, F1 score, precision, recall. **Generation**: Perplexity, BLEU score, human evaluation. **Custom metrics**: Task-specific measurements.

```python
import evaluate

def compute_metrics(eval_pred):
    metric = evaluate.load("accuracy")
    logits, labels = eval_pred
    predictions = logits.argmax(-1)
    return metric.compute(predictions=predictions, references=labels)
```

## Production Deployment

### Model Versioning

Pin specific versions for reproducibility:

```python
model = AutoModelForCausalLM.from_pretrained(
    "your-model",
    revision="v1.0.0"  # Pin specific version
)
```

### Safe Inference

Set deterministic defaults for production:

```python
def safe_generate(prompt, model, tokenizer):
    inputs = tokenizer(prompt, return_tensors="pt")

    with torch.no_grad():
        outputs = model.generate(
            inputs.input_ids,
            max_new_tokens=100,
            temperature=0.7,  # Conservative temperature
            do_sample=False,  # Deterministic
            pad_token_id=tokenizer.eos_token_id
        )

    return tokenizer.decode(outputs[0], skip_special_tokens=True)
```

## Hyperparameter Tuning

Start with validated defaults, then tune:

```python
# Sweep these hyperparameters
learning_rates = [1e-5, 2e-5, 5e-5]
batch_sizes = [4, 8, 16]
warmup_ratios = [0.03, 0.06, 0.1]

for lr in learning_rates:
    for bs in batch_sizes:
        args = TrainingArguments(
            learning_rate=lr,
            per_device_train_batch_size=bs,
            # ... other args
        )
        # Train and evaluate
```

## Troubleshooting Common Issues

> [!WARNING] Overfitting
> If the model memorizes training data, reduce epochs, increase dropout, add more diverse data, or use early stopping.

> [!TIP] Underfitting
> If performance is poor, increase model capacity, raise learning rate carefully, improve data quality, or train for more epochs.

> [!CAUTION] Memory Issues
> Enable gradient checkpointing, use smaller batch sizes, apply gradient accumulation, or switch to LoRA/PEFT.

## Scaling Up Training

For larger models or datasets:

```python
# Use accelerate for multi-GPU
from accelerate import Accelerator

accelerator = Accelerator()
model, optimizer, dataloader = accelerator.prepare(
    model, optimizer, dataloader
)

# Or use DeepSpeed for extreme scale
training_args = TrainingArguments(
    deepspeed="ds_config.json",
    # ... other args
)
```

## Ethics and Safety

**Licensing**: Respect base model and dataset licenses. **Privacy**: Avoid training on sensitive data without consent. **Bias**: Evaluate for harmful biases and implement safeguards. **Misuse**: Consider potential misuse and add appropriate warnings.

## Advanced Techniques

### Instruction Fine-Tuning

Format data as instruction-response pairs:

```python
def format_instruction(example):
    return {
        "text": f"### Instruction: {example['instruction']}\n"
                f"### Response: {example['response']}<|endoftext|>"
    }
```

### Multi-Task Fine-Tuning

Train on multiple tasks simultaneously:

```python
# Combine multiple datasets
combined_dataset = concatenate_datasets([
    dataset1.map(format_task1),
    dataset2.map(format_task2),
    dataset3.map(format_task3)
])
```

### Continual Learning

Fine-tune on new tasks without forgetting old ones:

```python
# Use elastic weight consolidation or similar techniques
from peft import TaskType

model = peft.get_peft_model(
    base_model,
    lora_config,
    task_type=TaskType.MULTI_TASK
)
```

## Conclusion

Fine-tuning transforms general-purpose models into specialized tools for your specific needs. Success depends on quality data, appropriate technique selection (full vs PEFT), and careful hyperparameter tuning. Start with LoRA for efficiency, use the Trainer API for simplicity, and always evaluate on held-out data. With proper fine-tuning, you can achieve state-of-the-art performance on your specific task while leveraging the knowledge encoded in pre-trained models.

## Further Reading

- [Transformers — Trainer](https://huggingface.co/docs/transformers/main/en/main_classes/trainer)
- [Hugging Face Course — Fine-tuning](https://huggingface.co/learn/nlp-course/chapter3/1?fw=pt)
- [PEFT (Parameter-Efficient Fine-Tuning)](https://github.com/huggingface/peft)
- [Accelerate](https://huggingface.co/docs/accelerate/index)
- [DeepSpeed](https://www.deepspeed.ai/)
- [LoRA Paper (Hu et al., 2021)](https://arxiv.org/abs/2106.09685)
