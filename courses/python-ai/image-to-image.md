---
title: Image-to-Image Transformations
description: >-
  Generate new images guided by both a textual prompt and an initial image;
  control fidelity with strength and guidance.
modified: '2025-09-20T10:39:54-06:00'
date: '2025-09-14T19:53:32.494Z'
---

> [!ABSTRACT] Key Takeaways
>
> - Image-to-image starts with partially noised source images, not pure noise
> - The strength parameter controls transformation degree (0 = original, 1 = new)
> - Preserve composition with lower strength; change style with higher values
> - Match latent resolution; prep images for better results
> - Works for style transfer, editing, variations, and upscaling tasks

## Overview

Image-to-image generation transforms existing images using text prompts, preserving aspects of the original while introducing new elements. Unlike text-to-image which starts from random noise, image-to-image begins with your source image, giving you creative control over how much to preserve versus transform.

Think of it like renovating a house instead of building from scratch. You keep the foundation and structure (the composition) but can change the style, colors, and details. The strength parameter is like choosing between a light refresh (new paint) or a complete remodel (new everything).

## Notebook

View the companion notebook: [Image to Image Transformations](https://colab.research.google.com/drive/1iI-RKtZOkL4DbaJKCIHIqkati3D1Yv_7?usp=sharing)

## Setting Up the Pipeline

Install dependencies and load the image-to-image pipeline:

```python
!pip install -q diffusers transformers accelerate

import torch
from diffusers import AutoPipelineForImage2Image
from PIL import Image
import requests
from io import BytesIO

# Load the pipeline
pipeline = AutoPipelineForImage2Image.from_pretrained(
    "stable-diffusion-v1-5/stable-diffusion-v1-5",
    torch_dtype=torch.float16,
    use_safetensors=True,
).to("cuda")

# Load an example image
img_url = "https://example.com/your-image.jpg"
response = requests.get(img_url)
init_image = Image.open(BytesIO(response.content)).convert("RGB")
init_image = init_image.resize((512, 512))
```

## The Strength Parameter

The strength parameter determines how much of your original image to preserve versus how much freedom the model has to change it. Strength maps to how far along the diffusion trajectory the process starts—high strength injects more noise (more change), low strength preserves structure (less change).

```python
prompt = "A oil painting of a landscape in impressionist style"

# Low strength - minimal changes
light_edit = pipeline(
    prompt=prompt,
    image=init_image,
    strength=0.3,
    guidance_scale=7.5
).images[0]

# Medium strength - balanced transformation
balanced_edit = pipeline(
    prompt=prompt,
    image=init_image,
    strength=0.5,
    guidance_scale=7.5
).images[0]

# High strength - major transformation
heavy_edit = pipeline(
    prompt=prompt,
    image=init_image,
    strength=0.8,
    guidance_scale=7.5
).images[0]
```

**Strength = 0.0**: Returns original unchanged. **Strength = 0.3**: Light edits, colors and textures change. **Strength = 0.5**: Balanced stylistic changes. **Strength = 0.8**: Heavy transformation, may alter composition. **Strength = 1.0**: Nearly equivalent to text-to-image.

## How It Works

The process differs from text-to-image in a crucial way:

1. **Encode**: Your image is encoded into latent space using the VAE encoder
2. **Add Noise**: Noise is added based on the strength parameter
3. **Denoise**: The U-Net removes noise while being guided by your text prompt
4. **Decode**: The VAE decoder converts the result back to an image

With strength=0.5, the model only runs the last 50% of denoising steps. Your image starts partially along the denoising trajectory, not from pure noise:

```python
# Understanding the math
total_steps = 50
strength = 0.5
start_step = int(total_steps * (1 - strength))  # Start at step 25
# Model runs steps 25-50, preserving early structure
```

## Practical Applications

### Style Transfer

Transform photos into different artistic styles while preserving composition:

```python
# Load a photo
photo = Image.open("landscape_photo.jpg").resize((512, 512))

styles = [
    "oil painting in the style of Van Gogh",
    "watercolor painting with soft edges",
    "pencil sketch with cross-hatching",
    "digital art in cyberpunk style"
]

styled_images = []
for style_prompt in styles:
    result = pipeline(
        prompt=style_prompt,
        image=photo,
        strength=0.6,
        guidance_scale=7.5
    ).images[0]
    styled_images.append(result)
```

### Object Modification

Change specific elements while keeping the rest intact:

```python
# Original: photo of a red car
prompt = "A blue car on a city street"

modified = pipeline(
    prompt=prompt,
    image=car_photo,
    strength=0.4,  # Lower strength to preserve composition
    guidance_scale=10,  # Higher guidance for prompt adherence
    negative_prompt="red, distorted, blurry"
).images[0]
```

### Creating Variations

Generate multiple versions of the same concept:

```python
prompt = "professional product photography of a watch"
variations = []

for i in range(4):
    generator = torch.Generator("cuda").manual_seed(i)
    variant = pipeline(
        prompt=prompt,
        image=watch_image,
        strength=0.35,
        generator=generator
    ).images[0]
    variations.append(variant)
```

## Composition Preservation

Prompts that mention objects and their relations help maintain layout. For strict structure preservation, combine with control methods when available:

```python
# Include spatial information in prompt
spatial_prompt = (
    "Mountain in the background, lake in the middle ground, "
    "trees in the foreground, sunset lighting"
)

# Use negative prompts to prevent unwanted changes
result = pipeline(
    prompt=spatial_prompt,
    image=landscape,
    strength=0.5,
    negative_prompt="cluttered, distorted perspective, warped"
).images[0]
```

## Progressive Refinement

Apply multiple passes with decreasing strength for controlled editing:

```python
def progressive_edit(image, prompt, strengths=[0.6, 0.4, 0.2]):
    current_image = image

    for strength in strengths:
        current_image = pipeline(
            prompt=prompt,
            image=current_image,
            strength=strength,
            guidance_scale=7.5
        ).images[0]

    return current_image

# Gradually transform the image
final = progressive_edit(
    init_image,
    "ethereal fantasy landscape with glowing crystals"
)
```

## Masked Editing (Inpainting)

For precise local edits, use inpainting pipelines:

```python
from diffusers import AutoPipelineForInpainting

inpaint_pipe = AutoPipelineForInpainting.from_pretrained(
    "runwayml/stable-diffusion-inpainting",
    torch_dtype=torch.float16
).to("cuda")

# Create a mask (white = edit, black = preserve)
mask = Image.new("L", (512, 512), 0)
# Draw white areas where you want changes

result = inpaint_pipe(
    prompt="a golden crown",
    image=portrait,
    mask_image=mask,
    strength=0.8
).images[0]
```

## Resolution Matching

Always match the model's native resolution for best results:

```python
def prepare_image(image, target_size=512):
    # Calculate aspect ratio
    aspect = image.width / image.height

    if aspect > 1:  # Landscape
        new_width = target_size
        new_height = int(target_size / aspect)
    else:  # Portrait or square
        new_height = target_size
        new_width = int(target_size * aspect)

    # Resize maintaining aspect ratio
    resized = image.resize((new_width, new_height), Image.LANCZOS)

    # Pad to square if needed
    if new_width != new_height:
        padded = Image.new("RGB", (target_size, target_size))
        paste_x = (target_size - new_width) // 2
        paste_y = (target_size - new_height) // 2
        padded.paste(resized, (paste_x, paste_y))
        return padded

    return resized
```

## Strength vs Steps Visualization

Understanding how strength affects the denoising process:

```python
import matplotlib.pyplot as plt
import numpy as np

# Visualize the relationship
strengths = np.linspace(0, 1, 11)
total_steps = 50

fig, ax = plt.subplots(figsize=(10, 6))

for strength in strengths:
    start_step = int(total_steps * (1 - strength))
    remaining_steps = total_steps - start_step

    ax.barh(
        strength,
        remaining_steps,
        left=start_step,
        height=0.08,
        label=f"Strength {strength:.1f}"
    )

ax.set_xlabel("Denoising Steps")
ax.set_ylabel("Strength Parameter")
ax.set_title("How Strength Controls the Denoising Process")
ax.set_xlim(0, total_steps)
plt.show()
```

Lower strength means fewer denoising steps, preserving more of the original. Higher strength means more denoising steps, allowing greater transformation.

## Upscaling with Image-to-Image

Use image-to-image for intelligent upscaling:

```python
from diffusers import StableDiffusionUpscalePipeline

upscale_pipe = StableDiffusionUpscalePipeline.from_pretrained(
    "stabilityai/stable-diffusion-x4-upscaler",
    torch_dtype=torch.float16
).to("cuda")

# Upscale 4x with enhancement
upscaled = upscale_pipe(
    prompt="high quality, detailed, sharp",
    image=low_res_image,
    num_inference_steps=20
).images[0]
```

## Troubleshooting

> [!WARNING] Loss of Detail
> If losing too much detail, reduce strength or increase guidance scale. Consider using img2img-specific models.

> [!TIP] Color Shifts
> To maintain original colors, include color descriptions in your prompt or use lower strength values (0.2-0.4).

> [!CAUTION] Resolution Artifacts
> Always resize images to model's native resolution (512×512 for SD 1.5, 768×768 or 1024×1024 for SDXL).

## Color and Style Consistency

To keep color palettes, use lower strength and fewer steps, or apply color transfer post-process. To change only style, keep semantic content in the prompt and emphasize stylistic descriptors:

```python
# Preserve colors while changing style
color_preserving_prompt = (
    "impressionist painting with vibrant blues and warm oranges, "
    "maintaining original color palette"
)

result = pipeline(
    prompt=color_preserving_prompt,
    image=original,
    strength=0.4,
    negative_prompt="desaturated, monochrome, color shift"
).images[0]
```

## Multi-pass Workflows

Iterate with small strength adjustments for complex transformations:

```python
# Stage 1: Style transfer
stage1 = pipeline(
    "oil painting style",
    image=photo,
    strength=0.5
).images[0]

# Stage 2: Lighting adjustment
stage2 = pipeline(
    "dramatic sunset lighting",
    image=stage1,
    strength=0.3
).images[0]

# Stage 3: Final touches
final = pipeline(
    "highly detailed, masterpiece",
    image=stage2,
    strength=0.2
).images[0]
```

Save seeds for each pass to re-run successful chains deterministically.

## Conclusion

Image-to-image generation offers precise control over AI image transformation. The strength parameter balances preservation versus transformation—start with 0.3-0.5 for most tasks. Lower values preserve structure while higher values allow creative freedom. Combine with progressive refinement, inpainting, and proper resolution handling for professional results. Remember that this technique excels at style transfer, concept variation, and iterative refinement tasks.

## Further Reading

- Diffusers — Image-to-Image: https://huggingface.co/docs/diffusers/main/en/using-diffusers/img2img
- Diffusers — Inpainting: https://huggingface.co/docs/diffusers/main/en/using-diffusers/inpaint
- ControlNet (Zhang and Agrawala): https://arxiv.org/abs/2302.05543
