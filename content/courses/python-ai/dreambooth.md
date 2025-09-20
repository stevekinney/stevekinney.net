---
title: DreamBooth — Personalizing Text-to-Image Models
description: >-
  Fine-tune a text-to-image model on a few photos to learn a specific subject;
  cover dataset prep, prior preservation, training, and inference.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T20:01:48.429Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Prepare 3-10 diverse instance images and a unique identifier token
> - Use prior preservation with class images to reduce overfitting
> - Start with conservative learning rates/steps; monitor periodic samples
> - Prefer LoRA for lightweight, composable adapters; full FT is heavier
> - Define evaluation prompts across styles/poses and keep seeds fixed for fair comparisons

## Overview

DreamBooth is a personalization technique that fine-tunes a full text-to-image diffusion model using just a handful (typically 3-5) of reference images. By associating a unique identifier token with the subject's class (for example, "a photo of [XYZ] dog"), the model learns to faithfully generate that specific subject in novel contexts, poses, and lighting conditions. This allows for high-fidelity, subject-driven image synthesis even with minimal training data.

## Notebook

View the companion notebook: [DreamBooth](https://colab.research.google.com/drive/1Swhhh_rQxRHgD1LGqJgvRigQ8eI5NvsA?usp=sharing)

## What We're Going to Do

1. Install dependencies
2. Upload your training images (3-10 high-quality images of your subject)
3. Train a DreamBooth model on your subject
4. Generate new images of your subject in different contexts

## Setting Up Dependencies

We need to import all the essential Python libraries and modules required for DreamBooth training and image generation:

```python
%pip install -q git+https://github.com/huggingface/diffusers
%pip install -q accelerate tensorboard transformers ftfy bitsandbytes
%pip install xformers -q --index-url https://download.pytorch.org/whl/cu124
%pip install -qq bitsandbytes

from pathlib import Path
import argparse
import itertools
import math
import os
from contextlib import nullcontext
import gc
import random
import numpy as np
import torch
import torch.nn.functional as F
import torch.utils.checkpoint
from torch.utils.data import Dataset

import PIL
from accelerate import Accelerator
from accelerate.logging import get_logger
from accelerate.utils import set_seed
from diffusers import (
    AutoencoderKL, DDPMScheduler, PNDMScheduler,
    StableDiffusionPipeline, UNet2DConditionModel
)
from diffusers.optimization import get_scheduler
from PIL import Image
from torchvision import transforms
from tqdm.auto import tqdm
from transformers import CLIPFeatureExtractor, CLIPTextModel, CLIPTokenizer

print("👨‍🎤 Environment ready to rock.")
```

## Data Preparation

### Uploading Your Images

Choose 3-10 images of your subject to upload. These should be high-quality photos with varied backgrounds, angles, and lighting:

```python
# Name your concept (e.g., your dog's name)
concept_name = "my-dog"  # @param {"type": "string"}
instance_data_dir = os.path.join("/content/", concept_name)

# Create the directory
os.makedirs(instance_data_dir, exist_ok=True)

print(f"Directory '{instance_data_dir}' created for your images. 💪")

# Check if the directory is empty before prompting for upload
if not os.listdir(instance_data_dir):
    print(f"Uploading images to {instance_data_dir}…")
    from google.colab import files
    uploaded = files.upload()

    # Move uploaded files to the instance directory
    for filename in uploaded.keys():
        os.rename(filename, os.path.join(instance_data_dir, filename))
else:
    print(f"Directory '{instance_data_dir}' is not empty. Skipping image upload.")

print("🩻 Images uploaded successfully.")
```

### Creating the Dataset Classes

DreamBooth requires custom PyTorch Dataset classes to handle data preparation:

```python
class DreamBoothDataset(Dataset):
    def __init__(
        self,
        instance_data_dir,
        instance_prompt,
        tokenizer,
        class_data_root=None,
        class_prompt=None,
        size=512,
        center_crop=False,
    ):
        self.size = size
        self.center_crop = center_crop
        self.tokenizer = tokenizer

        self.instance_data_dir = Path(instance_data_dir)
        if not self.instance_data_dir.exists():
            raise ValueError("Instance images root doesn't exists.")

        self.instance_images_path = list(Path(instance_data_dir).iterdir())
        self.num_instance_images = len(self.instance_images_path)
        self.instance_prompt = instance_prompt
        self._length = self.num_instance_images

        if class_data_root is not None:
            self.class_data_root = Path(class_data_root)
            self.class_data_root.mkdir(parents=True, exist_ok=True)
            self.class_images_path = list(Path(class_data_root).iterdir())
            self.num_class_images = len(self.class_images_path)
            self._length = max(self.num_class_images, self.num_instance_images)
            self.class_prompt = class_prompt
        else:
            self.class_data_root = None

        self.image_transforms = transforms.Compose(
            [
                transforms.Resize(size, interpolation=transforms.InterpolationMode.BILINEAR),
                transforms.CenterCrop(size) if center_crop else transforms.RandomCrop(size),
                transforms.ToTensor(),
                transforms.Normalize([0.5], [0.5]),
            ]
        )

    def __len__(self):
        return self._length

    def __getitem__(self, index):
        example = {}
        instance_image = Image.open(self.instance_images_path[index % self.num_instance_images])
        if not instance_image.mode == "RGB":
            instance_image = instance_image.convert("RGB")
        example["instance_images"] = self.image_transforms(instance_image)

        example["instance_prompt_ids"] = self.tokenizer(
            self.instance_prompt,
            padding="do_not_pad",
            truncation=True,
            max_length=self.tokenizer.model_max_length,
        ).input_ids

        if self.class_data_root:
            class_image = Image.open(self.class_images_path[index % self.num_class_images])
            if not class_image.mode == "RGB":
                class_image = class_image.convert("RGB")
            example["class_images"] = self.image_transforms(class_image)
            example["class_prompt_ids"] = self.tokenizer(
                self.class_prompt,
                padding="do_not_pad",
                truncation=True,
                max_length=self.tokenizer.model_max_length,
            ).input_ids

        return example

class PromptDataset(Dataset):
    def __init__(self, prompt, num_samples):
        self.prompt = prompt
        self.num_samples = num_samples

    def __len__(self):
        return self.num_samples

    def __getitem__(self, index):
        example = {}
        example["prompt"] = self.prompt
        example["index"] = index
        return example
```

## Prior Preservation and Class Images

Prior preservation helps prevent overfitting and maintains the model's ability to generate diverse examples from the broader class. If you don't have enough class images, the model generates them automatically:

```python
pretrained_model_name_or_path = "stabilityai/stable-diffusion-2"
prior_preservation_class_folder = "./class_images"
prior_preservation_class_prompt = "a photo of a pit bull"
prior_loss_weight = 0.5
num_class_images = 12
sample_batch_size = 2

class_images_dir = Path(prior_preservation_class_folder)
class_images_dir.mkdir(parents=True, exist_ok=True)

cur_class_images = len(list(class_images_dir.iterdir()))

if cur_class_images < num_class_images:
    pipeline = StableDiffusionPipeline.from_pretrained(
        pretrained_model_name_or_path,
        revision="fp16",
        torch_dtype=torch.float16
    ).to("cuda")
    pipeline.enable_attention_slicing()
    pipeline.set_progress_bar_config(disable=True)

    num_new_images = num_class_images - cur_class_images
    print(f"Number of class images to sample: {num_new_images}.")

    sample_dataset = PromptDataset(prior_preservation_class_prompt, num_new_images)
    sample_dataloader = torch.utils.data.DataLoader(
        sample_dataset,
        batch_size=sample_batch_size
    )

    for example in tqdm(sample_dataloader, desc="Generating class images"):
        images = pipeline(example["prompt"]).images

        for i, image in enumerate(images):
            image.save(class_images_dir / f"{example['index'][i] + cur_class_images}.jpg")

    del pipeline
    gc.collect()
    with torch.no_grad():
        torch.cuda.empty_cache()

print(f"Total number of class images: {len(list(class_images_dir.iterdir()))}")
```

## Model Components

DreamBooth training relies on key pre-trained components of Stable Diffusion:

### Text Encoder (CLIP)

Processes and embeds text prompts:

```python
text_encoder = CLIPTextModel.from_pretrained(
    pretrained_model_name_or_path,
    subfolder="text_encoder"
)
```

### VAE (Variational Autoencoder)

Maps images to and from a compact latent space for efficient training:

```python
vae = AutoencoderKL.from_pretrained(
    pretrained_model_name_or_path,
    subfolder="vae"
)
```

### U-Net Model

The core denoising component that transforms noise into images:

```python
unet = UNet2DConditionModel.from_pretrained(
    pretrained_model_name_or_path,
    subfolder="unet"
)
```

The U-Net is called that because of its U-shaped architecture: it has a downsampling path (analyzes the noisy image at multiple scales), a bottleneck (understands global context), and an upsampling path (rebuilds the image, refining it step by step).

### Tokenizer

Converts text to token IDs:

```python
tokenizer = CLIPTokenizer.from_pretrained(
    pretrained_model_name_or_path,
    subfolder="tokenizer"
)
```

## Training Configuration

Set up all training parameters:

```python
from argparse import Namespace

args = Namespace(
    pretrained_model_name_or_path=pretrained_model_name_or_path,
    resolution=vae.sample_size,
    center_crop=True,
    train_text_encoder=False,  # Can improve results but requires more memory
    instance_data_dir=instance_data_dir,
    instance_prompt=f"a photo of {concept_name}",
    learning_rate=5e-06,
    max_train_steps=300,
    save_steps=50,
    train_batch_size=2,
    gradient_accumulation_steps=2,
    max_grad_norm=1.0,
    mixed_precision="fp16",  # Use mixed precision for faster training
    gradient_checkpointing=True,  # Save memory
    use_8bit_adam=True,  # Lower memory usage
    seed=3434554,
    with_prior_preservation=True,
    prior_loss_weight=prior_loss_weight,
    sample_batch_size=2,
    class_data_dir=prior_preservation_class_folder,
    class_prompt=prior_preservation_class_prompt,
    num_class_images=num_class_images,
    lr_scheduler="constant",
    lr_warmup_steps=100,
    output_dir="dreambooth-concept",
)
```

## The Training Function

The training function executes the full DreamBooth fine-tuning process:

```python
def training_function(text_encoder, vae, unet):
    logger = get_logger(__name__)
    set_seed(args.seed)

    accelerator = Accelerator(
        gradient_accumulation_steps=args.gradient_accumulation_steps,
        mixed_precision=args.mixed_precision,
    )

    # Freeze VAE as it's not being trained
    vae.requires_grad_(False)
    if not args.train_text_encoder:
        text_encoder.requires_grad_(False)

    # Enable gradient checkpointing to save memory
    if args.gradient_checkpointing:
        unet.enable_gradient_checkpointing()
        if args.train_text_encoder:
            text_encoder.gradient_checkpointing_enable()

    # Use 8-bit Adam for lower memory usage
    if args.use_8bit_adam:
        import bitsandbytes as bnb
        optimizer_class = bnb.optim.AdamW8bit
    else:
        optimizer_class = torch.optim.AdamW

    # Determine parameters to optimize
    params_to_optimize = (
        itertools.chain(unet.parameters(), text_encoder.parameters())
        if args.train_text_encoder
        else unet.parameters()
    )

    optimizer = optimizer_class(
        params_to_optimize,
        lr=args.learning_rate,
    )

    noise_scheduler = DDPMScheduler.from_config(
        args.pretrained_model_name_or_path,
        subfolder="scheduler"
    )

    # Create the dataset
    train_dataset = DreamBoothDataset(
        instance_data_dir=args.instance_data_dir,
        instance_prompt=args.instance_prompt,
        class_data_root=args.class_data_dir if args.with_prior_preservation else None,
        class_prompt=args.class_prompt,
        tokenizer=tokenizer,
        size=args.resolution,
        center_crop=args.center_crop,
    )

    # Training loop continues...
```

The training loop repeatedly:

1. Encodes images into latents
2. Adds noise
3. Predicts the noise using the U-Net
4. Calculates loss (including prior preservation)
5. Backpropagates gradients
6. Updates model weights

## Running Training

Execute the training with proper class image generation:

```python
import accelerate

# Ensure class images are generated before training
if args.with_prior_preservation:
    class_images_dir = Path(args.class_data_dir)
    if not class_images_dir.exists():
        class_images_dir.mkdir(parents=True)

    cur_class_images = len(list(class_images_dir.iterdir()))
    if cur_class_images < args.num_class_images:
        # Generate missing class images
        pipeline = StableDiffusionPipeline.from_pretrained(
            args.pretrained_model_name_or_path,
            revision="fp16",
            torch_dtype=torch.float16
        ).to("cuda")

        # Generate and save images...

# Launch training
accelerate.notebook_launcher(
    training_function,
    args=(text_encoder, vae, unet)
)

# Clean up memory
for param in itertools.chain(unet.parameters(), text_encoder.parameters()):
    if param.grad is not None:
        del param.grad
torch.cuda.empty_cache()
```

## Using the Fine-Tuned Model

Load and use your personalized model:

```python
from diffusers import DiffusionPipeline

# Load the fine-tuned pipeline
model_path = args.output_dir
pipe = DiffusionPipeline.from_pretrained(
    model_path,
    torch_dtype=torch.float16
).to("cuda")

# Generate new images of your subject
suffix = "in space"  # @param {"type":"string"}
prompt = f"a photo of {concept_name} {suffix}"

image = pipe(
    prompt,
    num_inference_steps=50,
    guidance_scale=7.5
).images[0]

image
```

## LoRA vs Full Fine-tuning

### Full Fine-tuning

Updates all model weights. Produces highest quality but requires significant memory and storage.

### LoRA (Low-Rank Adaptation)

Adds small trainable matrices alongside frozen weights:

```python
from peft import LoraConfig, get_peft_model

lora_config = LoraConfig(
    r=4,  # Rank
    lora_alpha=32,
    target_modules=["to_k", "to_q", "to_v", "to_out.0"],
    lora_dropout=0.1,
)

model = get_peft_model(unet, lora_config)
# Now only LoRA parameters are trainable
```

Benefits include 100× fewer parameters to train, multiple subjects as separate adapters, and easy sharing (megabytes vs gigabytes).

## Hyperparameters and Best Practices

### Learning Rate

- **Too high (>1e-5)**: Overfitting, artifacts
- **Too low (<1e-7)**: Slow convergence
- **Sweet spot**: 2e-6 to 5e-6

### Training Steps

- **100-200**: Light adaptation
- **300-500**: Balanced
- **500+**: Risk of overfitting

### Prior Preservation Weight

- **0.5**: Standard balance
- **Higher**: More general, less specific
- **Lower**: More specific, risk overfitting

## Dataset Hygiene

Ensure quality training data:

- **Diverse angles**: Front, side, various expressions
- **Consistent quality**: Sharp, well-lit photos
- **Clean backgrounds**: Avoid busy/distracting elements
- **No watermarks**: Can confuse the model
- **Proper orientation**: Check EXIF data

## Evaluation Protocol

Define test prompts to evaluate your model:

```python
test_prompts = [
    f"{concept_name} as a superhero",
    f"{concept_name} in Van Gogh style",
    f"{concept_name} wearing a tuxedo",
    f"{concept_name} in ancient Rome",
]

for prompt in test_prompts:
    image = pipe(prompt, generator=torch.Generator("cuda").manual_seed(42)).images[0]
    # Save or display image
```

## Troubleshooting

> [!WARNING] Identity Drift
> If the subject doesn't look like your original, increase prior preservation weight, add more diverse instance images, or reduce learning rate.

> [!TIP] Overfitting Signs
> If backgrounds always look the same or poses are limited, reduce training steps, add more class images, or use earlier checkpoints.

> [!CAUTION] Memory Issues
> Enable gradient checkpointing, use LoRA instead of full fine-tuning, reduce batch size, or use 8-bit optimizers.

## Ethics and Safety

- **Consent**: Always obtain permission when training on people's likenesses
- **Attribution**: Respect original model licenses
- **Misuse**: Avoid creating deceptive or harmful content
- **Bias**: Be aware of inherited biases from base models

## Conclusion

DreamBooth enables powerful personalization of diffusion models with just a few images. Success depends on balancing training intensity with prior preservation, using quality diverse images, and carefully tuning hyperparameters. Start with conservative settings and iterate. Consider LoRA for efficient training and deployment. With proper setup, you can create models that faithfully reproduce subjects in novel contexts while maintaining the base model's creative capabilities.

## Further Reading

- DreamBooth (Ruiz et al., 2022): https://arxiv.org/abs/2208.12242
- Diffusers — DreamBooth Training: https://huggingface.co/docs/diffusers/main/en/training/dreambooth
- Classifier-Free Guidance: https://arxiv.org/abs/2207.12598
- LoRA (Hu et al., 2021): https://arxiv.org/abs/2106.09685
