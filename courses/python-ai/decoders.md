---
title: Decoders and Text Generation
description: >-
  Practical guide to causal decoders and generation strategies like greedy, beam
  search, top-k/top-p sampling, temperature, and penalties.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:43:52.263Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Choose decoding per goal: greedy/beam for determinism, top-p/k+temperature for creativity
> - Control repetition with penalties and no-repeat n-grams; set explicit stop conditions
> - Prefer `max_new_tokens` for clarity with long prompts; always set EOS handling
> - Enable KV cache for streaming; batch by length for throughput
> - Use processors/warpers to shape logits before sampling

## Overview

Decoder-only architectures generate text autoregressively, predicting the next token given previous context. Models like GPT masterfully generate new text by writing stories, answering questions, and completing sentences one token at a time. Understanding how these models work reveals the architecture and step-by-step process behind text generation.

## Notebook

View the companion notebook: [Decoders](https://colab.research.google.com/drive/1ZUmRw8pTJaGum1gzJZ4H49X9aWkd9zfW?usp=sharing)

## Causal Attention: The One-Way Window

Imagine reading a mystery novel one page at a time—you can see everything that already happened but can't peek at future pages. A causal attention mask makes language models behave the same way. When generating the next word, the mask hides all future words, so the model can only attend to words it has already produced.

The key difference between text-generation models (decoders) and text-understanding models (encoders) is how they see input:

**Encoder (like BERT)** uses bidirectional attention. When analyzing "sat" in "the cat sat on the mat," it sees both "the cat" (before) and "on the mat" (after). Perfect for understanding full context.

**Decoder (like GPT)** uses causal attention. When generating "sat," it only sees "the cat" that came before. It cannot see the future because those words don't exist yet.

This restriction is essential—when generating text, the model must predict the next word based only on what it has already written.

## Visualizing the Causal Mask

The causal mask explicitly prevents the model from attending to future tokens by setting their attention scores to negative infinity before the softmax:

```python
import torch
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Create a causal mask for 5 tokens
sequence_length = 5
causal_mask = torch.triu(torch.ones(sequence_length, sequence_length) * -1e9, diagonal=1)

# Visualize the mask
plt.figure(figsize=(6, 6))
sns.heatmap(causal_mask, cmap='viridis', annot=True, fmt=".0f", cbar=False,
            xticklabels=np.arange(sequence_length), yticklabels=np.arange(sequence_length))
plt.title("Causal Attention Mask Heatmap")
plt.xlabel("Key Token Index")
plt.ylabel("Query Token Index")
plt.show()
```

In the mask, `0` means "pay attention" and large negative numbers mean "ignore." This ensures each position only influences itself and past positions, creating the left-to-right generation pattern.

## Decoder Architecture

A decoder-only model like GPT-2 is a stack of identical decoder blocks. Each block has two main components:

**Masked Multi-Head Self-Attention** applies the causal mask we discussed, allowing the model to weigh the importance of previous words. **Feed-Forward Neural Network** processes the attention output, adding computational depth to learn complex patterns.

This stack processes token embeddings, with the final block's output feeding into a language modeling head—a linear layer projecting the final representation into a massive vector with one score for every word in the vocabulary:

```python
from transformers import AutoTokenizer, AutoModelForCausalLM

model_name = "gpt2-medium"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name)

# Make sure the tokenizer has a padding token for batching
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# The language modeling head
print("Language Modeling Head (Output Layer):")
print(model.lm_head)
print(f"Vocabulary size: {tokenizer.vocab_size}")
```

## Autoregressive Generation

Autoregressive is a fancy term for a simple idea: the model's next prediction depends on its own previous predictions. The generation process follows a step-by-step loop:

1. Start with a prompt
2. The model predicts probabilities for the next token
3. A decoding strategy selects one token from the probability distribution
4. The selected token is added to the input sequence
5. Repeat from step 2 until a stop token is generated or maximum length is reached

The most interesting part is step 3: how do we choose the next token?

## Decoding Strategies

### Greedy Search

Greedy search always picks the most likely next token. It's fast and predictable but often produces boring, repetitive text:

```python
prompt = "The future of artificial intelligence is"
inputs = tokenizer(prompt, return_tensors="pt")

# Generate with greedy search
greedy_output = model.generate(
    inputs.input_ids,
    max_new_tokens=20,
    num_beams=1,
    do_sample=False
)

print("Greedy Search Output:")
print(tokenizer.decode(greedy_output[0], skip_special_tokens=True))
```

### Sampling with Temperature

Instead of always picking the top token, we can sample from the probability distribution. Temperature controls randomness:

```python
import torch.nn.functional as F

# Get the model's predicted probabilities for the next word
with torch.no_grad():
    outputs = model(**inputs)
    next_token_logits = outputs.logits[:, -1, :]
    probs = F.softmax(next_token_logits, dim=-1).cpu().numpy().flatten()

# Function to apply temperature
def apply_temperature(logits, temperature):
    return F.softmax(logits / temperature, dim=-1).cpu().numpy().flatten()

# Visualize temperature effects
temperatures = [0.1, 0.7, 1.5]

plt.figure(figsize=(15, 5))
for i, temp in enumerate(temperatures):
    plt.subplot(1, len(temperatures), i + 1)
    temp_probs = apply_temperature(next_token_logits, temp)
    # Get top 20 tokens for visualization
    topk_probs, topk_indices = torch.topk(torch.from_numpy(temp_probs), 20)
    topk_tokens = [tokenizer.decode(i) for i in topk_indices]

    plt.bar(topk_tokens, topk_probs.numpy(), color='skyblue')
    plt.title(f"Temperature = {temp}")
    plt.xticks(rotation=90)
    plt.ylabel("Probability")

plt.tight_layout()
plt.show()

# Generate with sampling
sampling_output = model.generate(
    inputs.input_ids,
    max_new_tokens=50,
    do_sample=True,
    temperature=0.7,
    top_k=0
)

print("\nSampling with Temperature (0.7):")
print(tokenizer.decode(sampling_output[0], skip_special_tokens=True))
```

**Low temperature (0.2)** makes the distribution "peakier"—the model becomes confident and conservative, similar to greedy search. **High temperature (1.5)** flattens the distribution—the model takes risks, leading to creative or nonsensical text.

Think of temperature like a creativity dial: turn it down for safety, turn it up for experimentation.

### Top-K and Top-P (Nucleus) Sampling

Sampling can produce weird words if it randomly picks low-probability tokens. We filter the distribution before sampling:

**Top-K Sampling** only considers the k most likely tokens. With `top_k=50`, the model samples from only the 50 most probable words.

**Top-P (Nucleus) Sampling** dynamically adapts. It considers the smallest set of tokens whose cumulative probability exceeds threshold p. If `p=0.9`, it samples from tokens making up 90% of probability mass.

```python
# Generate with Top-P (Nucleus) Sampling
nucleus_output = model.generate(
    inputs.input_ids,
    max_new_tokens=50,
    do_sample=True,
    top_p=0.92,
    top_k=0  # Disable top-k
)

print(tokenizer.decode(nucleus_output[0], skip_special_tokens=True))
```

Top-P is generally recommended for high-quality text generation because it adapts to the situation—when the model is certain, it considers few words; when uncertain, it considers many.

## Common Limitations

**Context Window**: Models have finite memory. GPT-2 has a 1024-token context window—it cannot remember anything beyond that window.

**Repetition**: Models can get stuck in loops. Parameters like `repetition_penalty` help:

```python
output = model.generate(
    **inputs,
    max_new_tokens=60,
    do_sample=True,
    top_p=0.95,
    temperature=0.8,
    repetition_penalty=1.05,      # Penalize repeated tokens
    no_repeat_ngram_size=3,       # Block exact 3-gram repeats
    eos_token_id=tokenizer.eos_token_id
)
```

**Hallucination**: Models can generate plausible-sounding but factually incorrect text. They're pattern-matching machines without true understanding.

**Bias**: Models inherit societal biases from training data. Always be critical of output.

## Stopping Mid-Sentence

Models learn to end sentences naturally by predicting an end-of-sequence (EOS) token. During training, they observe sentence patterns and learn to associate thought completion with the EOS token. When the probability of EOS becomes highest, generation stops:

```python
# Increase max_new_tokens to allow for a full sentence
natural_stop_output = model.generate(
    inputs.input_ids,
    max_new_tokens=100,  # Give the model plenty of room
    do_sample=True,
    top_p=0.92,
    temperature=0.7,
    top_k=0,
    eos_token_id=tokenizer.eos_token_id
)

print(tokenizer.decode(natural_stop_output[0], skip_special_tokens=True))
```

## Text Generation versus Question Answering

Models like ChatGPT and GPT are highly advanced text-generation systems at their core. They don't switch between different modes—their single, powerful text-generation ability has been trained to recognize patterns so well that it produces the right kind of text for any task:

When you ask a question, it generates text that is an answer. When you ask for a summary, it generates text that is a summary. When you ask it to translate, it generates text in the target language.

### Extractive vs Generative QA

**Extractive QA** (like our hot dog example earlier) finds and pulls exact answers from provided context. It cannot use outside knowledge.

**Generative QA** (ChatGPT, Claude, Gemini) generates answers from scratch based on vast knowledge learned during training. This is why they can answer questions on almost any topic without needing specific context.

### The Secret: Instruction Fine-Tuning

Base models start as massive decoders trained to predict the next word on huge portions of the internet. After this, instruction fine-tuning trains them on high-quality `[instruction, response]` pairs written by humans. This teaches the model how to be a helpful assistant:

```json
{
  "instruction": "What is the capital of France?",
  "response": "The capital of France is Paris."
}
```

By training on millions of such examples, the model learns that when input text is a question, the statistically likeliest "next tokens" form a coherent answer. The model isn't "deciding" to answer—its training has made answer text the most probable continuation of question text.

## From Logits to Tokens: Processors and Warpers

The generation loop computes logits at each step, then applies processors before sampling:

```python
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

tok = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2").eval()

inp = tok("Write a haiku about the ocean:\n", return_tensors="pt")

out = model.generate(
    **inp,
    max_new_tokens=60,
    do_sample=True,
    top_p=0.95,
    temperature=0.8,
    repetition_penalty=1.05,
    no_repeat_ngram_size=3,
    eos_token_id=tok.eos_token_id,
)

print(tok.decode(out[0], skip_special_tokens=True))
```

Typical processors include minimum/maximum length enforcement, repetition penalties, bad-words filtering, and forced tokens. Warpers reshape the distribution through top-k, top-p, and temperature adjustments.

## Beam Search Nuances

Beam search explores multiple hypotheses to maximize overall sequence likelihood:

```python
beam_output = model.generate(
    inputs.input_ids,
    max_new_tokens=30,
    num_beams=5,
    early_stopping=True
)
```

Beam search maintains k partial hypotheses, expands them, and applies length normalization to avoid preferring short sequences. It produces higher quality but more compute-intensive output.

## Performance Tips

**Caching**: Use KV-cache to avoid recomputing attention for past tokens in long generations. Enable with `model.config.use_cache = True`.

**Batching**: Group prompts of similar length to maximize throughput and minimize padding waste.

**Mixed precision**: Use fp16/bf16 for faster inference on modern GPUs:

```python
model = model.half()  # Convert to fp16
# or
model = model.to(torch.bfloat16)
```

## Determinism and Testing

Set random seeds and use greedy or low-temperature decoding when you need reproducible outputs:

```python
torch.manual_seed(42)
output = model.generate(
    inputs.input_ids,
    do_sample=False,  # Deterministic greedy decoding
    max_new_tokens=50
)
```

Note that floating-point non-determinism on GPUs can still cause small variations; prefer beam or greedy for critical paths.

## Streaming and Latency

For interactive applications, stream tokens as they are generated. Maintain a cache of key/value tensors to achieve token-level latencies. For batch serving, group prompts by length to minimize padding waste.

## Conclusion

Decoders generate text through a carefully orchestrated process: causal attention forces left-to-right generation, stacked transformer blocks build deep representations, the language modeling head produces vocabulary probabilities, and decoding strategies balance quality with creativity.

Understanding these mechanisms demystifies how models like GPT work. The "magic" of `pipeline("text-generation")` is now revealed as an elegant interplay of attention masks, probability distributions, and sampling strategies. Modern conversational AI builds on these foundations, adding instruction tuning and safety measures to create helpful, harmless assistants from powerful text generators.

## Further Reading

- Transformers — Text Generation: https://huggingface.co/docs/transformers/main/en/generation_strategies
- Logits Processors and Warpers: https://huggingface.co/docs/transformers/main/en/main_classes/text_generation#transformers.LogitsProcessor
- The Curious Case of Neural Text Degeneration (Holtzman et al., nucleus sampling): https://arxiv.org/abs/1904.09751
- Beam Search Optimization: https://arxiv.org/abs/1707.07862
