---
published: true
title: 'What If It Goes Wrong?: The Hidden Dangers of Counterfactual Reasoning in AI'
description: >-
  Exploring the pitfalls of counterfactual reasoning in AI, highlighting its
  fragility, chaotic nature, and alignment with Nassim Taleb's critique of
  prediction in complex systems.
modified: 2025-07-29T21:09:56.000Z
date: 2025-04-21T16:48:47.000Z
---

> [!NOTE] Paper Review
> These are my notes from the paper, [When Counterfactual Reasoning Fails: Chaos and Real-World Complexity](https://arxiv.org/abs/2503.23820) by [Yahya Aalaila](https://arxiv.org/search/cs?searchtype=author&query=Aalaila,+Y), [Gerrit Großmann](https://arxiv.org/search/cs?searchtype=author&query=Gro%C3%9Fmann,+G), [Sumantrak Mukherjee](https://arxiv.org/search/cs?searchtype=author&query=Mukherjee,+S), [Jonas Wahl](https://arxiv.org/search/cs?searchtype=author&query=Wahl,+J), and [Sebastian Vollmer](https://arxiv.org/search/cs?searchtype=author&query=Vollmer,+S).

[Counterfactual reasoning](https://en.wikipedia.org/wiki/Counterfactual_thinking)—the mental gymnastics of wondering "what if"—is baked into how we think. Have you ever wondered, "What if I'd taken that other job?" or "What if that meeting had gone differently?" We ask "What if?" questions all the time. (It's how I spent the majority of my 20s, if I am being honest.) These are called [counterfactuals](https://plato.stanford.edu/entries/counterfactuals/), and help us understand cause and effect and interpreting complex models,.

But what if these counterfactual questions actually lead us astray? Some [recent research](https://arxiv.org/abs/2503.23820)—which we'll talk about today—can be problematic when working with AI systems.

## The Importance of Context in Counterfactual Reasoning

One aspect of counterfactual reasoning is the context in which it is applied. The same counterfactual question can yield different insights. Determining what _did_ happen is a bit more straight-forward than opining all of the stuff that _could have_ happened. In a perfect world, a counterfactual analysis might provide clear and actionable insights. In chaotic or complex systems, however, the same analysis could mislead us into oversimplifying the situation.

In terms of AI, where models are trained on vast datasets and operate under complex algorithms, the context becomes even more critical. We need to ensure that counterfactual analyses consider the intricacies of the models and the environments in which they operate. Models tend to be trained on real data, not counterfactual data. The problem is that it's totally reasonable for a human to prompt the model with a counterfactual.

Subtle changes in how we pose questions or prompt models can lead to different interpretations and conclusions. The paper highlights the need for careful consideration and a deep understanding of the system at hand when employing counterfactual reasoning.

## Chaos, Uncertainty, and the Fragility of "What If?"

Consider this:

- LLMs are trained on vast amounts of data where we show the model the expected output for a given input.
- The model creates connections between the words in the input and the words in desired output.
- When we prompt the model, it uses those connections to generate an output to a novel promp.
- But, typically, we're training a model on "right answers."
- So, what happens if we ask the model a counterfactual?

At first glance, counterfactual reasoning seems straightforward: tweak something, imagine how things play out differently, and learn from the imagined outcomes. See also: [our recent conversation on neural networks](./neural-networks.md). That said, recent insights into [chaotic systems](https://en.wikipedia.org/wiki/Chaos_theory) reveal that even tiny changes—like a minor tweak to an initial condition or a small error in estimating a parameter can lead to dramatically different results. This phenomenon, commonly known as the [butterfly effect](https://en.wikipedia.org/wiki/Butterfly_effect)—which was also [a movie with Asthon Kutcher](https://en.wikipedia.org/wiki/The_Butterfly_Effect)—is highlighted in the paper that we're discussing today, ["When Counterfactual Reasoning Fails: Chaos and Real-World Complexity"](https://arxiv.org/abs/2503.23820).

In controlled experiments on [chaotic dynamical systems](https://en.wikipedia.org/wiki/Chaos_theory) (such as the [Lorenz](https://en.wikipedia.org/wiki/Lorenz_system) and [Rössler](https://en.wikipedia.org/wiki/R%C3%B6ssler_attractor) systems), the authors demonstrate that small inaccuracies or uncertainties can cause huge deviations from expected outcomes. Even when their models seemed precise, counterfactual predictions quickly spiraled into completely unreliable territory. This fragility starkly illustrates that in chaotic contexts, counterfactuals aren't just hypothetical—they can be flat-out misleading.

> [!WARNING] Counterfactual Fragility
> Even small errors in model parameters or initial conditions can completely derail the reliability of counterfactual predictions in chaotic systems.

## How Does This Relate to AI and Large Language Models?

At their core, modern AI systems learn complex relationships between billions of parameters, and as we've seen, complexity can easily give way to chaos. If a minor shift in input can trigger major, unexpected changes in the model's behavior, then any counterfactual explanations or analyses we generate from these models could be inherently unstable.

Take interpretability as an example: When we use counterfactual reasoning to explain why a language model generated a particular response ("Had the input been slightly different, it would have answered differently"), we implicitly trust that the system behaves predictably. But given the potential chaotic nature of complex neural networks, minor variations in inputs—say, a different phrasing or subtle prompt adjustments—can cause wildly different outputs. This undermines our confidence in counterfactual explanations that we rely on for model transparency.

This sensitivity isn't limited to explanations alone. It impacts fairness assessments, robustness benchmarks, and even safety evaluations in AI.

For example, efforts to ensure that an AI system behaves fairly across different hypothetical scenarios ("What if the applicant were from a different demographic group?") can break down when the model's internal decision boundaries are chaotic. Instead of reliably measuring fairness, we might end up exacerbating existing biases without even realizing it.

> [!DANGER] Hidden Risks in Counterfactual AI
> Counterfactual methods intended to improve fairness, robustness, or interpretability might unintentionally introduce or amplify issues due to underlying chaotic behaviors.

## Real-World Consequences: Trust, Fairness, and Safety

Imagine an AI system used in medicine that predicts patient outcomes. This is an area where you can't really afford to get stuff wrong. If the underlying predictive model is sensitive to tiny changes—like a slight miscalibration in patient data—then using counterfactual reasoning to recommend personalized treatments ("What if this patient had received a different dosage?") becomes risky. The recommended treatments might look sound superficially but could fail unpredictably when applied to real-world scenarios.

In areas such as automated finance, weather forecasting, or autonomous vehicles, this danger multiplies. The inherent sensitivity of complex AI systems means minor inaccuracies or slight misunderstandings can escalate into major errors in judgment or prediction.

## Nassim Taleb and the Fragility of Counterfactual Reasoning

[Nassim Nicholas Taleb](https://en.wikipedia.org/wiki/Nassim_Nicholas_Taleb)'s book [_The Black Swan_](https://amzn.to/42UhiVY) argues that complex systems resist reliable prediction because rare but impactful events dominate, making forecasts based on past data unreliable.

Taleb would almost certainly interpret the paper as illustrating the "[ludic fallacy](https://en.wikipedia.org/wiki/Ludic_fallacy)," which describes the misuse of simplified, structured models to understand messy, real-world complexities. The paper demonstrates precisely how these models can break down when confronted with genuine complexity, uncertainty, and chaos—conditions Taleb consistently warns against in his critique of overly confident modeling.

The findings also exemplify Taleb's concept of "[fragility](https://arxiv.org/abs/1209.2298)," the idea that certain systems deteriorate quickly under uncertainty or volatility. The paper clearly shows how minor perturbations can drastically alter outcomes, reinforcing his argument that fragility often manifests through extreme sensitivity to small changes.

Taleb is notably skeptical of simplistic causal narratives, a skepticism encapsulated in his idea of the "[narrative fallacy](https://en.wikipedia.org/wiki/Narrative_fallacy)." The unreliable nature of counterfactual reasoning demonstrated in the paper confirms his view that retrospective "what-if" scenarios often mislead more than they inform, especially in opaque, complex systems.

## So, What Should We Do?

The research doesn't suggest abandoning counterfactual reasoning altogether, but it urges caution and heightened scrutiny. AI researchers, developers, and users need to explicitly test the robustness of their counterfactual analyses. This means intentionally checking how sensitive models are to slight variations in inputs and parameters.

We should embrace uncertainty estimation, transparently communicating areas where models exhibit sensitivity or unpredictability. Benchmarks must be carefully designed to measure not just model accuracy but robustness against small, realistic perturbations. Ultimately, developers and stakeholders must maintain a healthy skepticism when interpreting counterfactual scenarios, especially in high-stakes environments.

> [!TIP] Practical Steps for Robust Counterfactual Reasoning
> To reduce risks:
>
> - Explicitly test models for sensitivity to minor input variations.
> - Clearly communicate uncertainties and instabilities in model predictions.
> - Design benchmarks and evaluations that explicitly account for chaotic or unpredictable behaviors.

## A Word of Caution for AI's Future

The rise of sophisticated AI systems promises immense possibilities, but it also brings complexity—and with complexity often comes chaos. Counterfactual reasoning remains a powerful tool, essential for understanding and improving AI. But as we've seen, it is a tool that can mislead just as easily as it can illuminate.

## References and Further Reading

If this kind of thing is up your alley, then paper also references some other related research.

- [From Deterministic ODEs to Dynamic Structural Causal Models](https://arxiv.org/abs/1608.08028) (Rubenstein et al., 2016)
- [Counterfactual Explanations in Sequential Decision Making Under Uncertainty](https://arxiv.org/abs/2103.01035) (Tsirtsis et al., 2021)
- [The Dangers of Post-Hoc Interpretability: Unjustified Counterfactual Explanations](https://arxiv.org/abs/1907.09294) (Laugel et al., 2019)
- [If Only We Had Better Counterfactual Explanations: Five Key Deficits to Rectify in the Evaluation of Counterfactual XAI Techniques](https://arxiv.org/abs/2103.01035) (Keane et al., 2021)
- [Cophy: Counterfactual Learning of Physical Dynamics](https://arxiv.org/abs/1909.12000) (Baradel et al., 2019)
- [Filtered-CoPhy: Unsupervised Learning of Counterfactual Physics in Pixel Space](https://arxiv.org/abs/2202.00368) (Janny et al., 2022)
- [CLEVRER: Collision Events for Video Representation and Reasoning](https://arxiv.org/abs/1910.01442) (Yi et al., 2019)
- [Dynamic Visual Reasoning by Learning Differentiable Physics Models from Video and Language](https://arxiv.org/abs/2103.16010) (Ding et al., 2021)
- [Causal Modeling of Dynamical Systems](https://arxiv.org/abs/1803.08784) (Bongers et al., 2018)
- [A Practical Approach to Causal Inference Over Time](https://arxiv.org/abs/2410.10502) (Cinquini et al., 2024)
- [Time Series Deconfounder: Estimating Treatment Effects Over Time in the Presence of Hidden Confounders](https://arxiv.org/abs/2002.11663) (Bica et al., 2020)
- [Counterfactual Analysis in Dynamic Latent State Models](https://arxiv.org/abs/2302.03094) (Haugh & Singal, 2023)
- [Peculiarities of Counterfactual Point Process Generation](https://arxiv.org/abs/2403.17218) (Großmann et al., 2024)
