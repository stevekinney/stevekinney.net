---
title: Pipeline Basics (Hugging Face)
description: >-
  Understand Hugging Face Pipelines, tasks, model/tokenizer loading, batching,
  devices, and configuration for quick, production-ready inference.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:39:41.572Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Pipelines standardize I/O by orchestrating tokenizer → model → post-processing
> - Pin explicit model and revision; always pair the correct tokenizer
> - Batch inputs, enable truncation/padding, and use the GPU with mixed precision
> - Control decoding (temperature, top-p/k, beams) and set safe stop conditions
> - Log model IDs, revisions, and parameters; apply guardrails to prompts/outputs
> - Drop to `Auto*` APIs when you need custom preprocessing or logits control

## Overview

Pipelines provide a batteries-included wrapper around models, tokenizers, and post-processing for common tasks. Think of the `pipeline` as a magic wand that bundles together all the necessary steps to go from raw text to structured output: preprocessing (converting text into numbers a model understands), model inference (feeding numbers through the model for predictions), and post-processing (cleaning up output for human readability).

## Notebook

View the companion notebook: [Pipeline Basics](https://colab.research.google.com/drive/1OnAQGIBrbkbJYC3h-Vf3mUwru9K3usSt?usp=sharing)

## Getting Started with Pipelines

Pipelines handle eight major categories of tasks, each with specific inputs and outputs:

| Task                         | Input              | Output                    | Example Use Case        |
| ---------------------------- | ------------------ | ------------------------- | ----------------------- |
| **Sentiment Analysis**       | Text               | Sentiment label + score   | Product reviews         |
| **Text Generation**          | Prompt text        | Generated continuation    | Chatbots, story writing |
| **Zero-shot Classification** | Text + Categories  | Category probabilities    | Email routing           |
| **Question Answering**       | Question + Context | Extracted answer          | FAQ systems             |
| **Fill-Mask**                | Text with `<mask>` | Predicted words           | Autocomplete            |
| **Summarization**            | Long text          | Short summary             | News digests            |
| **Named Entity Recognition** | Text               | Entity labels + positions | Privacy compliance      |
| **Translation**              | Source text        | Target language text      | Multilingual support    |

## Sentiment Analysis

Sentiment analysis determines whether text expresses positive or negative emotions. It's one of the most common NLP tasks with applications in customer review analysis, social media monitoring, and support ticket prioritization.

```python
from transformers import pipeline

sentiment_analyzer = pipeline(
    "sentiment-analysis",
    model="distilbert-base-uncased-finetuned-sst-2-english"
)

texts = [
    "I love this product! It's amazing.",
    "This is terrible. I hate it.",
    "It's okay, nothing special.",
]

for text in texts:
    result = sentiment_analyzer(text)[0]
    label = result["label"]
    confidence = result["score"]
    print(f"Text: {text}")
    print(f"Sentiment: {label} (Confidence: {confidence:.3f})\n")
```

The confidence score indicates model certainty: 0.999 means 99.9% confident (very sure), 0.750 means 75% confident (pretty sure), and 0.500 means 50% confident (uncertain).

> [!WARNING] Binary Classification Limitation
> The default sentiment model only outputs `POSITIVE` or `NEGATIVE`. It lacks a `NEUTRAL` category and may struggle with sarcasm or complex emotions.

## Text Generation

Text generation creates new text from a starting prompt. Unlike sentiment analysis which interprets existing text, generation creates text that didn't exist before.

```python
text_generator = pipeline("text-generation", model="gpt2")

prompts = [
    "The future of artificial intelligence is",
    "Once upon a time in a distant galaxy",
]

for prompt in prompts:
    generated = text_generator(
        prompt,
        max_new_tokens=100,
        num_return_sequences=1,
        temperature=0.7,
        do_sample=True,
        pad_token_id=text_generator.tokenizer.eos_token_id,
    )
    print(f"{prompt}...")
    print(generated[0]["generated_text"])
    print("-" * 50)
```

### Understanding Generation Parameters

**`max_new_tokens`** controls the maximum number of tokens to generate after the prompt. **`temperature`** acts like a creativity dial: low values (0.1-0.5) produce conservative text, medium values (0.6-0.9) balance creativity, and high values (1.0+) create experimental output. **`do_sample=True`** enables probabilistic sampling for variety. **`top_p`** and `top_k` control the sampling pool size.

Think of temperature like cooking: low heat gives predictable results, medium heat balances flavor and safety, and high heat creates bold but risky dishes.

## Zero-Shot Classification

Zero-shot classification categorizes text into labels you define without any training examples. The model uses its language understanding to match text to categories based on meaning alone.

```python
classifier = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")

candidate_labels = ["business", "technology", "sports", "entertainment", "politics"]

texts = [
    "Apple reported record quarterly earnings driven by strong iPhone sales.",
    "The Denver Nuggets defeated the Lakers in last night's basketball game.",
]

for text in texts:
    result = classifier(text, candidate_labels)

    print(f"Text: {text}")
    print("Classifications:")
    for label, score in zip(result["labels"], result["scores"]):
        print(f"  {label}: {score:.3f}")
    print("-" * 50)
```

The model converts classification into natural language inference. For each category, it creates a hypothesis ("This text is about [category]"), evaluates how well each hypothesis fits, and returns probability scores that sum to 1.0.

### Multi-Label Classification

By default, the classifier assumes each text belongs to ONE category. Enable multi-label for texts that fit multiple categories:

```python
result = classifier(
    "The new iPhone is expensive but innovative.",
    candidate_labels=["technology", "business", "review"],
    multi_label=True
)
```

## Question Answering

Question answering extracts exact text spans that answer questions from provided context. This is extractive QA - it finds answers within the text, never generating new information.

```python
qa_pipeline = pipeline(
    "question-answering",
    model="distilbert-base-cased-distilled-squad",
)

context = """
The modern hot dog traces its roots to German sausages brought to the U.S. by immigrants
in the 1800s. The first famous hot-dog stand popped up on Coney Island in 1871, allegedly
selling 3,684 sausages in buns during its first year. Nathan's Famous launched its annual
Hot Dog Eating Contest in 1916, turning competitive eating into a Fourth-of-July spectacle.
"""

questions = [
    "Where did the first famous hot-dog stand appear?",
    "What competitive eating event did Nathan's Famous start?",
]

for question in questions:
    result = qa_pipeline(question=question, context=context)
    print(f"Question: {question}")
    print(f"Answer: {result['answer']}")
    print(f"Confidence: {result['score']:.3f}\n")
```

> [!CAUTION] Answer Must Exist
> The model will guess if the answer isn't in the context, usually with low confidence. Always check confidence scores - below 0.5 typically means unreliable answers.

## Fill-Mask

Fill-mask predicts missing words based on context, revealing how models understand word relationships:

```python
fill_mask = pipeline("fill-mask", model="distilroberta-base")

sentences = [
    "The capital of France is <mask>.",
    "Python is a popular <mask> language.",
]

for sentence in sentences:
    print(f"Original: {sentence}")
    results = fill_mask(sentence, top_k=3)

    print("Top predictions:")
    for i, result in enumerate(results, 1):
        token = result["token_str"]
        score = result["score"]
        print(f"  {i}. '{token}' (score: {score:.3f})")
    print("-" * 50)
```

Different models use different mask tokens: BERT uses `[MASK]` while RoBERTa uses `<mask>`. The pipeline handles this automatically.

## Summarization

Summarization condenses long texts while preserving key information. Modern models use abstractive summarization - they rewrite content concisely rather than just extracting sentences.

```python
summarizer = pipeline("summarization", model="sshleifer/distilbart-cnn-12-6")

long_text = """
The modern hot dog traces its roots to German sausages brought to the U.S. by immigrants
in the 1800s. The first famous hot-dog stand popped up on Coney Island in 1871, allegedly
selling 3,684 sausages in buns during its first year. Classic toppings include mustard,
ketchup (controversial in Chicago), relish, onions, and sauerkraut. Nathan's Famous
launched its annual Hot Dog Eating Contest in 1916, turning competitive eating into a
Fourth-of-July spectacle.
"""

summary = summarizer(
    long_text,
    max_length=50,
    min_length=10,
    do_sample=False
)

print("Original Text:")
print(long_text)
print("\nSummary:")
print(summary[0]['summary_text'])
```

Control summary length with `max_length` and `min_length`. Setting `do_sample=False` ensures deterministic, consistent summaries.

## Named Entity Recognition (NER)

NER identifies and classifies named entities in text - people, organizations, locations, and more. It's crucial for information extraction and privacy compliance.

```python
ner_pipeline = pipeline(
    "ner",
    aggregation_strategy="simple",
    model="dbmdz/bert-large-cased-finetuned-conll03-english",
)

texts = [
    "My name is John Smith and I work at Apple Inc. in Cupertino, California.",
    "Tesla CEO Elon Musk announced the new factory will be built in Austin, Texas.",
]

for text in texts:
    print(f"Text: {text}")
    entities = ner_pipeline(text)

    if entities:
        print("Entities found:")
        for entity in entities:
            word = entity["word"]
            label = entity["entity_group"]
            confidence = entity["score"]
            print(f"  '{word}' -> {label} (confidence: {confidence:.3f})")
    print("-" * 50)
```

Standard entity types include **PER** (Person), **ORG** (Organization), **LOC** (Location), and **MISC** (Miscellaneous). Always use `aggregation_strategy="simple"` to get complete words instead of subword tokens.

## Translation

Translation converts text between languages using specialized models:

```python
translator = pipeline("translation_en_to_de", model="Helsinki-NLP/opus-mt-en-de")

text = "The future of artificial intelligence is fascinating."
translation = translator(text)

print(f"Original (English): {text}")
print(f"Translated (German): {translation[0]['translation_text']}")
```

Models are typically named with source and target languages (e.g., `en-to-de` for English to German).

## Performance Optimization

### Device Selection

Use GPU when available for faster inference:

```python
import torch

device = 0 if torch.cuda.is_available() else -1
pipeline = pipeline("text-generation", model="gpt2", device=device)
```

### Batching

Process multiple inputs together for better throughput:

```python
texts = ["Text 1", "Text 2", "Text 3"]
results = sentiment_analyzer(texts, batch_size=8)
```

### Mixed Precision

Enable fp16/bf16 for faster inference and lower memory usage:

```python
pipeline = pipeline(
    "text-generation",
    model="gpt2",
    torch_dtype=torch.float16
)
```

## Advanced Configuration

### Custom Models and Tokenizers

Specify exact models and revisions for reproducibility:

```python
from transformers import AutoTokenizer, AutoModelForSequenceClassification

model = AutoModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased-finetuned-sst-2-english",
    revision="refs/pr/123"  # Pin specific version
)
tokenizer = AutoTokenizer.from_pretrained(
    "distilbert-base-uncased-finetuned-sst-2-english"
)

classifier = pipeline(
    "sentiment-analysis",
    model=model,
    tokenizer=tokenizer
)
```

### Truncation and Padding

Handle variable-length inputs properly:

```python
results = pipeline(
    texts,
    truncation=True,
    padding=True,
    max_length=512
)
```

## Common Pitfalls and Solutions

> [!WARNING] Context Length Limits
> Models have maximum context windows. GPT-2 handles 1024 tokens, BERT handles 512. Texts exceeding limits get truncated or cause errors.

> [!TIP] Handling Repetition in Generation
> If generated text repeats, adjust `repetition_penalty` or use different decoding strategies like beam search.

> [!CAUTION] Inappropriate Content
> Models trained on internet text may generate biased or inappropriate content. Always apply content filters for production use.

## Production Considerations

### Safety and Monitoring

For production deployments, implement content filters for generated text, validate inputs to prevent prompt injection, log model predictions for debugging, and monitor latency and error rates. Set conservative defaults for generation parameters and implement timeout mechanisms for long-running inferences.

### Caching and Optimization

Cache models locally to avoid repeated downloads:

```python
from transformers import pipeline
import os

# Set cache directory
os.environ["TRANSFORMERS_CACHE"] = "/path/to/cache"

# Models download once, then load from cache
pipeline = pipeline("sentiment-analysis")
```

### Error Handling

Wrap pipeline calls with proper error handling:

```python
def safe_inference(pipeline, text, max_retries=3):
    for attempt in range(max_retries):
        try:
            return pipeline(text)
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # Exponential backoff
```

## When to Move Beyond Pipelines

Use lower-level `AutoTokenizer` and `AutoModel` APIs when you need custom preprocessing, multi-task heads, control over logits processing, or tight integration with retrieval or reranking systems. Pipelines are ideal for quick prototypes and many production cases, but bespoke systems benefit from explicit control.

```python
# Example: Custom logits processing
from transformers import AutoTokenizer, AutoModelForCausalLM

tokenizer = AutoTokenizer.from_pretrained("gpt2")
model = AutoModelForCausalLM.from_pretrained("gpt2")

inputs = tokenizer("Hello", return_tensors="pt")
outputs = model(**inputs)
logits = outputs.logits  # Direct access to raw scores

# Custom processing here
```

## Conclusion

Hugging Face pipelines democratize access to state-of-the-art NLP models. They handle the complexity of tokenization, model inference, and post-processing, letting you focus on solving problems rather than implementation details. Start with pipelines for rapid prototyping, then customize as your needs grow. With thousands of models available on the Hugging Face Hub, you can find pre-trained solutions for almost any NLP task imaginable.

## Further Reading

- Transformers — Pipelines: https://huggingface.co/docs/transformers/main/en/main_classes/pipelines
- Transformers — Task Summary: https://huggingface.co/docs/transformers/main/en/task_summary
- Accelerate: https://huggingface.co/docs/accelerate/index
- Optimum: https://huggingface.co/docs/optimum/index
- bitsandbytes (8-bit/4-bit): https://github.com/TimDettmers/bitsandbytes
