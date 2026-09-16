---
title: Hugging Face Pipeline Tasks
description: A list of all of the things you can do with a Hugging Face Transformers.
---

The `pipeline()` function in the Hugging Face Transformers library is a **high-level abstraction that offers the simplest way to use pre-trained AI models out-of-the-box** for various tasks. It handles the necessary preprocessing and postprocessing steps, allowing you to input raw data and receive intelligible answers.

Here are the different tasks you can perform with a `pipeline()`:

- **Sentiment Analysis**: This task aims to determine whether a piece of text expresses a positive, negative, or neutral sentiment. Use cases include analyzing movie or product reviews, tweets, customer feedback, and social media posts.
- **Text Generation**: This involves generating coherent and creative text based on a given prompt or starting point. It's useful for writing assistance, poetry and story generation, educational chats, and even coding. The model auto-completes the input by predicting the most probable next word. Parameters like `max_length` and `num_return_sequences` can control the output.
- **Zero-Shot Classification**: This allows you to classify text into categories **even if the model was not explicitly trained on those labels**. You provide a set of `candidate_labels`, and the model returns probability scores for each. It's powerful for auto-labeling customer concerns without custom training.
- **Summarization**: This task condenses long text into a shorter version while preserving its key information and meaning. It can be extractive (pulls key sentences) or abstractive (rewrites content). Useful for news, research, meeting notes, emails, and reports. You can specify `max_length` and `min_length` for the summary.
- **Translation**: This converts text from one language to another. Hugging Face supports models for hundreds of languages.
- **Fill-Mask / Masked Language Modeling**: This task involves filling in the blanks (masked words or tokens) in a given text. It's how models like BERT are trained. The pipeline returns top likely replacements along with confidence scores.
- **Named Entity Recognition (NER)**: This pipeline identifies and classifies important keywords in a sentence into predefined categories, such as names of people (PER), places (LOC), or organizations (ORG). It's great for news tagging, searching, indexing, resume parsing, and legal documents. The `grouped_entities=True` option regroups parts of a sentence corresponding to the same entity.
- **Question Answering**: This pipeline extracts an answer span from a given context to a provided question. It's useful for chatbots, search tools, and interactive learning.
- **Feature Extraction**: This task extracts vector representations (embeddings) of text. These raw embeddings can be used for tasks like sentence similarity or as input for custom classification heads.
- **Image Classification**: This helps models recognize objects, people, or animals in pictures. It predicts the likelihood that an image belongs to a specified class.
- **Object Detection**: This locates and identifies objects within images.
- **Image-to-Text**: This generates text descriptions of images.
- **Automatic Speech Recognition (ASR)**: This converts spoken audio into text. It's the backbone of voice assistants, auto-captioning tools, and audio note transcriptions.
- **Audio Classification**: This classifies audio into categories.
- **Text-to-Speech**: This converts text into spoken audio.
- **Multimodal (e.g., Image-Text-to-Text)**: These pipelines combine and process data from multiple sources or modalities. For example, they can respond to an image based on a text prompt.

The `pipeline()` function allows for flexibility, letting you specify a particular model from the Hugging Face Hub for a given task, rather than just using the default. You can also pass a list of inputs to pipelines for efficient batch inference.
