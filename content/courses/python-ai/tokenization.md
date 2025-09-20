---
title: Tokenization — From Text to Tensors
description: >-
  Learn how text becomes model-ready tensors via subword tokenization, special
  tokens, padding, truncation, and attention masks.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:38:17.032Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Subword tokenization (BPE/WordPiece/SentencePiece) balances coverage and vocab size
> - Special tokens, attention masks, and segment IDs must match model expectations
> - Use truncation/padding wisely; sliding windows with stride preserve cross-chunk context
> - Offsets map tokens back to text spans for tasks like NER and highlighting
> - Prefer fast tokenizers; reuse a single instance and batch tokenization for speed

## Overview

Tokenization transforms raw text into integer IDs that models can process. Since neural networks only understand numbers, tokenization bridges human text and AI models through four key steps: splitting text into smaller units (tokens), mapping tokens to unique IDs from a vocabulary, adding special tokens that give the model instructions, and creating attention masks to handle batches efficiently.

## Notebook

View the companion notebook: [Tokenization](https://colab.research.google.com/drive/15cChgqEWrWTtWApWRBSQBqFpmWDe2ZR7?usp=sharing)

## Setting Up Tokenizers

Different models use different tokenization strategies. Let's explore the most common ones:

```python
from transformers import AutoTokenizer

# Load tokenizers for different models
tokenizers = {
    "BERT": AutoTokenizer.from_pretrained("bert-base-uncased"),
    "GPT-2": AutoTokenizer.from_pretrained("gpt2"),
    "RoBERTa": AutoTokenizer.from_pretrained("roberta-base"),
    "T5": AutoTokenizer.from_pretrained("t5-small")
}

# Check vocabulary sizes
for name, tokenizer in tokenizers.items():
    print(f"{name}: Vocabulary size = {tokenizer.vocab_size:,}")
```

Each tokenizer has a fixed vocabulary. BERT knows about 30,000 unique tokens, while GPT-2 knows about 50,000. Any word not in this vocabulary gets broken down into smaller subwords or marked as unknown.

## Basic Tokenization

The fundamental step splits text into tokens. Common words become single tokens, while rare words split into subwords:

```python
text = "Hello, world! Tokenization is the process of converting text into tokens."
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Tokenize the text
tokens = tokenizer.tokenize(text)
print(tokens)
# Output: ['hello', ',', 'world', '!', 'token', '##ization', 'is', ...]
```

The `##` prefix in BERT's tokenizer signifies that the token continues the previous one. This subword approach lets models handle rare words by breaking them into familiar pieces.

## From Tokens to IDs

Models need numbers, not text. Each token maps to a unique ID:

```python
text = "Hello, world!"
tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# The encode method tokenizes and converts to IDs in one step
token_ids = tokenizer.encode(text)

print(f"Original Text: {text}")
print(f"Token IDs: {token_ids}")
# Output: Token IDs: [101, 7592, 1010, 2088, 999, 102]
```

Each number represents a specific token: "hello" → 7592, "world" → 2088. The model processes these numbers, not the original text.

## Special Tokens

Special tokens provide structure and instructions to the model:

```python
# BERT adds special tokens automatically
decoded = tokenizer.decode(token_ids)
print(f"Decoded: {decoded}")
# Output: [CLS] hello , world ! [SEP]
```

**`[CLS]`** (101) marks the start of a sequence, used for classification tasks. **`[SEP]`** (102) separates different segments or marks the end. **`[PAD]`** (0) fills shorter sequences to match batch length. **`[UNK]`** replaces unknown words not in vocabulary. **`[MASK]`** is used for masked language modeling during training.

These tokens are crucial for model performance. Without them, the model wouldn't understand where sequences begin and end or how to handle different segments.

## Batch Processing and Attention Masks

Models are most efficient processing multiple texts at once. However, batched texts have different lengths. Padding solves this, but how does the model know which tokens to ignore? Attention masks provide the answer.

### The Flashlight Analogy

Think of an attention mask as a flashlight in a dark room. You want to illuminate only the real words, not the padding. The mask tells the model where to "shine its light" (pay attention):

```python
texts = [
    "The cat sat on the mat.",
    "The cat sat.",
]

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")
inputs = tokenizer(texts, padding=True, return_tensors="pt")

print("Token IDs:")
print(inputs["input_ids"])
print("\nAttention Mask:")
print(inputs["attention_mask"])
```

Output shows how padding works:

```
Token IDs:
[[101, 1996, 4937, 3323, 2006, 1996, 13523, 1012, 102],
 [101, 1996, 4937, 3323, 1012, 102, 0, 0, 0]]

Attention Mask:
[[1, 1, 1, 1, 1, 1, 1, 1, 1],
 [1, 1, 1, 1, 1, 1, 0, 0, 0]]
```

Each number in the attention mask is like a light switch: `1` means "Look at this word!" and `0` means "Skip this one, it's just padding."

## Comparing Tokenizers

Different tokenizers handle the same text differently:

```python
text = "Uncommon-tokenization: transformers' tokenizers are fast."

for name, tok in tokenizers.items():
    tokens = tok.tokenize(text)
    print(f"{name}: {len(tokens)} tokens")
    print(f"  Sample: {tokens[:5]}...")
```

BERT might split "Uncommon" into `['un', '##common']` while GPT-2 keeps it whole. RoBERTa uses byte-level encoding, and T5 uses SentencePiece. Each approach has trade-offs between vocabulary size, handling of rare words, and multilingual support.

## Practical Tokenization Settings

Key parameters control tokenization behavior:

```python
# Full tokenization with all options
encoded = tokenizer(
    text,
    padding="max_length",      # Pad to max_length
    truncation=True,           # Cut if too long
    max_length=128,           # Maximum sequence length
    return_tensors="pt",      # Return PyTorch tensors
    return_offsets_mapping=True,  # Character spans
    return_attention_mask=True    # Attention mask
)
```

**`padding`** options include `'longest'` for dynamic padding per batch, `'max_length'` for fixed shapes across batches, and `False` for no padding. **`truncation`** ensures sequences fit within model limits. **`return_tensors`** can be `"pt"` for PyTorch, `"tf"` for TensorFlow, or `None` for lists.

## Handling Long Documents

Long texts exceed model limits and must be chunked intelligently:

```python
long_text = "Very long document..." * 100

# Use sliding windows with overlap
encoded = tokenizer(
    long_text,
    max_length=512,
    truncation=True,
    return_overflowing_tokens=True,
    stride=64,  # Overlap between chunks
)

print(f"Number of chunks: {len(encoded['input_ids'])}")
```

The `stride` parameter creates overlap between chunks, preserving context at boundaries. This improves coherence for tasks like question answering or summarization.

## Decoding and Offset Mapping

Convert IDs back to text and track character positions:

```python
# Encode with offset mapping
enc = tokenizer(
    "The quick brown fox",
    return_offsets_mapping=True
)

# Decode back to text
decoded = tokenizer.decode(enc["input_ids"], skip_special_tokens=True)

# Offsets show character spans for each token
for token_id, (start, end) in zip(enc["input_ids"], enc["offset_mapping"]):
    if start != end:  # Skip special tokens
        token = tokenizer.decode([token_id])
        original_span = text[start:end]
        print(f"Token: '{token}' maps to characters {start}:{end} = '{original_span}'")
```

Offset mapping enables precise alignment between model predictions and original text, essential for tasks like named entity recognition or highlighting specific spans.

## How Subword Tokenization Works

Modern tokenizers use subword algorithms to balance vocabulary size with coverage:

**Byte-Pair Encoding (BPE)** starts with characters and iteratively merges the most frequent pairs. **WordPiece** (used by BERT) uses a likelihood-based scoring for merges. **SentencePiece** treats text as raw bytes, enabling language-agnostic tokenization.

The process normalizes text (lowercasing, unicode normalization), pre-tokenizes into rough chunks (whitespace, punctuation), applies learned merge rules to create subwords, and maps final tokens to vocabulary IDs.

## Performance Optimization

Fast tokenizers (Rust-backed) provide significant speedups:

```python
# Fast tokenizers have additional capabilities
fast_tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased", use_fast=True)

# Batch tokenization is vectorized
texts = ["Text 1", "Text 2", "Text 3"] * 100
%timeit fast_tokenizer(texts, padding=True, truncation=True)
```

Optimization tips include reusing tokenizer instances to avoid reloading vocabularies, batch processing texts together rather than individually, using fast tokenizers for 10-100x speedups, and caching tokenized datasets to avoid repeated processing.

## Common Pitfalls and Solutions

> [!WARNING] Mismatched Tokenizers
> Always pair the exact tokenizer with its model. Using BERT's tokenizer with GPT-2's model produces garbage output.

> [!TIP] Handling Special Characters
> Check how your tokenizer handles unicode, emojis, and special characters. Some normalize aggressively, others preserve everything.

> [!CAUTION] Wrong Max Length
> Too small truncation loses critical context. Too large wastes memory. Profile your data to find optimal lengths.

## Token Type IDs and Segment Handling

Some models (like BERT) use token type IDs for paired inputs:

```python
# Question-answering or sentence pair classification
question = "What is tokenization?"
context = "Tokenization converts text to numbers for models to process."

inputs = tokenizer(
    question,
    context,
    return_token_type_ids=True
)

# Token type IDs mark which segment each token belongs to
print(inputs["token_type_ids"])
# [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1]
#  <-- question --> <---- context ----->
```

## Advanced Tokenization Patterns

For production systems, consider these patterns:

```python
class SmartTokenizer:
    def __init__(self, model_name, max_length=512):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.max_length = max_length

    def tokenize_batch(self, texts, **kwargs):
        # Default settings for consistency
        return self.tokenizer(
            texts,
            padding="longest",
            truncation=True,
            max_length=self.max_length,
            return_tensors="pt",
            **kwargs
        )

    def smart_truncate(self, text, preserve_end=False):
        # Sometimes the end of text is more important
        tokens = self.tokenizer.tokenize(text)
        if len(tokens) > self.max_length - 2:  # Account for special tokens
            if preserve_end:
                tokens = tokens[-(self.max_length - 2):]
            else:
                tokens = tokens[:self.max_length - 2]
        return self.tokenizer.convert_tokens_to_ids(tokens)
```

## Debugging Tokenization

When things go wrong, inspect the tokenization process:

```python
def debug_tokenization(tokenizer, text):
    # Step-by-step breakdown
    tokens = tokenizer.tokenize(text)
    token_ids = tokenizer.convert_tokens_to_ids(tokens)
    decoded = tokenizer.decode(token_ids)

    print(f"Original: {text}")
    print(f"Tokens: {tokens}")
    print(f"IDs: {token_ids}")
    print(f"Decoded: {decoded}")
    print(f"Matches original? {decoded.lower() == text.lower()}")

    # Check special tokens
    full_ids = tokenizer.encode(text)
    print(f"With special tokens: {full_ids}")
    print(f"Special token positions: {[i for i, id in enumerate(full_ids)
                                       if id in tokenizer.all_special_ids]}")
```

## Conclusion

Tokenization is the foundation of all NLP tasks. Understanding how text becomes numbers, how padding and attention masks work, and how different tokenizers behave helps you debug issues, optimize performance, and build more sophisticated applications. Every string processed by a language model goes through this crucial transformation from human-readable text to model-ready tensors.

## Further Reading

- Transformers — Tokenizer Summary: https://huggingface.co/docs/transformers/main/en/tokenizer_summary
- Tokenizers Library: https://huggingface.co/docs/tokenizers/index
- Byte Pair Encoding (Sennrich et al., 2015): https://arxiv.org/abs/1508.07909
- WordPiece (Schuster and Nakajima, 2012): https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/37842.pdf
- SentencePiece (Kudo and Richardson, 2018): https://arxiv.org/abs/1808.06226
