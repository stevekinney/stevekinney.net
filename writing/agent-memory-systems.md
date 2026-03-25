---
title: 'Memory Systems for AI Agents: What the Research Says and What You Can Actually Build'
description: >-
  The old short-term/long-term taxonomy doesn't capture what modern agent
  memory systems actually do. A new three-axis framework—Forms, Functions,
  and Dynamics—maps the design space from flat vector stores to RL-driven
  memory management. Here's what the research says and what you can build today.
date: 2026-03-25
modified: 2026-03-25
tags:
  - ai
  - agents
  - memory
  - retrieval
---

I've been building an agent memory system for the last few days, and it sent me down one of those rabbit holes where you start reading one paper on arXiv and surface three hours later with forty browser tabs and a completely different understanding of the problem. The thing that triggered it was a simple frustration: every agent I use—[Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview), [Cursor](https://cursor.com), custom stuff I've built with the [Vercel AI SDK](https://ai-sdk.dev)—forgets everything between sessions. They treat every conversation like their first. I've explained my project structure, my preferences, my constraints, and then the context window fills up or the session ends and all of that knowledge evaporates.

This isn't a new observation. But what _is_ new is that the research community has been remarkably productive on this problem over the last year. In December 2025, Hu et al. published ["Memory in the Age of AI Agents"](https://arxiv.org/abs/2502.12851)—a 107-page survey that attempts to unify a fragmented field. (They also maintain a [companion paper list on GitHub](https://github.com/memory-agent/memory-agent-papers) that's actively updated.) Dozens of other papers have landed since: [A-Mem](https://arxiv.org/abs/2502.12110) bringing Zettelkasten-style linked notes to agent memory with 85–93% token reduction, [StructMemEval](https://arxiv.org/abs/2502.13649) showing that simple retrieval can outperform complex memory hierarchies, [Memori](https://arxiv.org/abs/2503.00760) achieving 81.95% accuracy at 5% of full context cost using semantic triples, and a bunch more I'll reference as we go.

The old taxonomy—short-term memory versus long-term memory—is dead. It doesn't capture what modern agent memory systems actually do. The survey proposes a three-axis framework that I've found genuinely useful for thinking about the design space: **Forms** (where does memory live?), **Functions** (why does the agent need memory?), and **Dynamics** (how does memory operate over time?). That framework is what this post is organized around. I'll walk through what the research says at each axis, what's practical today versus what's still on the research frontier, and the design decisions you'll face if you're building a memory system for your own agents.

One thing I want to be upfront about: I'm synthesizing a lot of material here. I've read the papers and I've been building against some of these ideas, but I'm not a memory systems researcher. If I've mischaracterized someone's work, call me out in the comments.

## The three forms: where does memory live?

The first axis asks a deceptively simple question: where does the memory physically reside? The answer splits into three categories, and the split matters because it determines what you can actually _build_ with hosted models versus what requires running your own infrastructure.

### Token-level memory (the one you'll actually use)

**Token-level memory** is memory stored as explicit, discrete, human-readable units—text chunks, facts, user profiles, conversation logs. You write it to a database, you read it back, you stuff it into the prompt. It's the form that works with any model, hosted or self-hosted, because it operates entirely outside the model's internals. You can inspect it, debug it, edit it, and swap the underlying model without touching your memory layer.

This is what [Mem0](https://github.com/mem0ai/mem0), [Letta](https://github.com/letta-ai/letta) (formerly MemGPT), [Zep](https://github.com/getzep/zep), and most production memory frameworks implement. And for good reason: it's the only form that's actually tractable if you're using a hosted frontier model through an API.

But "token-level" isn't a single design. There's a spectrum of topological complexity within it, and where you land on that spectrum matters:

- **Flat (1D):** A bag of entries with vector search over them. You store facts, you embed them, you retrieve the most similar ones at query time. Mem0 and MemGPT both started here. It's the simplest approach, and it works surprisingly well when paired with a good retrieval pipeline. Most systems should start here.
- **Planar (2D):** Entries connected via explicit relationships—graphs, trees, linked notes. A-Mem's [Zettelkasten-style links](https://arxiv.org/abs/2502.12110), Zep's temporal knowledge graph, [RAPTOR](https://arxiv.org/abs/2401.18059)'s recursive abstractive tree. These structures enable multi-hop reasoning—following chains of connections to answer questions that no single entry can answer alone. The trade-off is maintenance complexity. Graphs need to be pruned, updated, and kept consistent as new information arrives.
- **Hierarchical (3D):** Multiple abstraction layers with cross-layer links. Raw entries at the bottom, cluster summaries in the middle, global abstractions at the top. [HippoRAG](https://arxiv.org/abs/2405.14831) implements a dual-layer approach inspired by how the hippocampus indexes memories. Most powerful for complex reasoning, most complex to build and maintain.

Here's the practical guidance: flat is probably right for your system. I know that sounds anticlimactic after describing the full spectrum, but the [StructMemEval benchmark](https://arxiv.org/abs/2502.13649) showed that simple retrieval can outperform complex memory hierarchies on standard benchmarks like LoCoMo and LongMemEval. Move to planar or hierarchical only when you observe specific retrieval failures that flat retrieval can't solve—like multi-hop questions where the answer requires chaining through multiple entries.

### Latent memory (the one you need to understand but probably won't build)

**Latent memory** is memory stored as the model's own internal representations—hidden states, KV cache entries, compressed vectors. It lives inside the model's computation, not in an external database.

Before we go further, I need to address the naming collision that trips up every engineer I've talked to about this. When memory researchers say "KV cache," they do _not_ mean Redis. They do not mean a key-value database. The "Key" and "Value" in a transformer's KV cache are linear projections of each token's hidden state that serve specific roles in the attention mechanism. The Query vector multiplied by the Key vector produces a relevance score, which is then used to weight-blend the Value vectors. It's an internal data structure of the transformer architecture, not a caching layer in the infrastructure sense. (I've seen experienced engineers spend twenty minutes confused about this in paper discussions, so if that was you, you're in good company.)

With that cleared up, latent memory has three subtypes:

- **Reuse:** Save the KV cache from a forward pass, reload it later. The model picks up where it left off. [Memorizing Transformers](https://arxiv.org/abs/2203.08913) (Wu et al., 2022), [LONGMEM](https://arxiv.org/abs/2306.07174), and FOT all explore this approach.
- **Transform:** Prune or compress the KV cache to keep only what matters. [SnapKV](https://arxiv.org/abs/2404.14469) uses head-wise voting to decide what to keep. [H2O](https://arxiv.org/abs/2306.14048) evicts "heavy hitter" entries. [PyramidKV](https://arxiv.org/abs/2406.02069) allocates different budgets per layer. The idea is the same across all of them: the model was paying attention to certain tokens more than others, so keep those and drop the rest.
- **Generate:** Train a separate module to compress input into a handful of "memory tokens." [Gist tokens](https://arxiv.org/abs/2304.08467) (Mu et al., 2023), [AutoCompressor](https://arxiv.org/abs/2305.14788) (Chevalier et al., 2023), and [Titans](https://arxiv.org/abs/2501.00663) (Behrouz et al., 2025—which uses an online-updated MLP to produce latent vectors) all take this approach. The model literally learns to compress its context into a compact representation.

Now here's why I said "probably won't build": every single one of these techniques requires access to internal model state—`past_key_values`, `output_hidden_states`, `output_attentions`, or `inputs_embeds`. These are HuggingFace Transformers access points on PyTorch models. Hosted APIs—Anthropic, OpenAI, Google—expose none of them. You can't reach into Claude's KV cache from the API. You can't inject custom embedding vectors into GPT-4's forward pass.

What providers _do_ give you is prompt caching (provider-managed KV reuse—Anthropic caches your system prompt, for example) and embeddings endpoints (useful for retrieval but not injectable back into the forward pass). These are related to latent memory, but they're black-box optimizations you can't control or extend.

There's also a language constraint worth noting: this is Python-only territory. PyTorch and HuggingFace Transformers is where the internal access points live. Transformers.js and ONNX Runtime for Node.js don't expose the needed internals. If you're building in TypeScript (and I usually am), latent memory is off the table entirely.

### Parametric memory (the one that changes the model itself)

**Parametric memory** encodes knowledge directly into model weights via fine-tuning, LoRA adapters, or knowledge editing techniques like [ROME](https://arxiv.org/abs/2202.05262) and [MEMIT](https://arxiv.org/abs/2210.07229). When you fine-tune a model on your company's codebase, the knowledge becomes part of the model's parameters. Every conversation benefits from it—no retrieval step needed.

The distinction from latent memory is important: parametric changes are _permanent_ and affect every conversation. Latent memory is ephemeral and scoped to the current context. If latent memory is a snapshot injected before a specific task, parametric memory is muscle memory from years of practice. The chef who can debone a fish without thinking has parametric memory. The chef who glances at a recipe card before plating has something closer to latent memory.

Same hosted-model constraint applies: you need weight access, which APIs don't provide. Provider fine-tuning services exist (Anthropic, OpenAI, Google all offer them), but they don't support continuous, incremental updates. You can't fine-tune Claude a little more every time a user teaches it something new. It's a batch process, not a memory system in the sense the survey means.

### The practical scorecard

Here's where the 107-page paper compresses to one practical insight:

- **Token-level:** Works with any model. Inspectable, debuggable, editable. This is your lane if you're using hosted frontier models, which—let's be honest—most of us are.
- **Latent:** Open-source models only, or invisible provider-side optimizations you can't control. Research-grade infrastructure required.
- **Parametric:** Open-source models only, with a weak exception for provider fine-tuning services that don't support the incremental updates a real memory system needs.

If you're building an agent that talks to Claude, GPT-4, or Gemini through an API, your entire memory design space is token-level. Master the topology spectrum (flat → planar → hierarchical) and get very good at the dynamics layer—formation, evolution, retrieval—operating over token-level stores. That's where all the leverage is.

## The three functions: why do agents need memory?

The second axis asks what memory is _for_. The survey identifies three functional categories, and they map more cleanly to practical design decisions than the forms axis does.

### Factual memory: "What does the agent know?"

This is the most intuitive category—declarative facts about the world. User preferences, environment state, conversation history, project context. "The user prefers TypeScript." "The project uses Tailwind." "Last session, we were debugging a race condition in the checkout flow."

Cognitive science splits declarative memory into **episodic** (event-specific: "the user told me about the bug on Tuesday") and **semantic** (general knowledge: "the project uses PostgreSQL"). Agent systems mirror this split with user-facing facts—identity, preferences, commitments the agent has made—and environment-facing facts—document states, resource availability, tool configurations.

Factual memory enables three properties that matter in practice: **consistency** (don't contradict yourself across conversations), **coherence** (maintain topical continuity within a conversation), and **adaptability** (personalize behavior over time based on what you learn about the user).

This is what most memory frameworks implement today. When people say "agent memory," they usually mean factual memory. Mem0, MemGPT, [MemoryBank](https://arxiv.org/abs/2305.10250), Zep—they all store facts and retrieve them. It's table stakes. The interesting question is what _else_ your memory system should capture.

### Experiential memory: "How does the agent improve?"

This is the missing piece in most agent frameworks, and I think it's the most underexplored area for practitioners. Factual memory tells the agent what it knows. Experiential memory tells it how to do things _better_—how it solved problems in the past, what worked, what didn't.

Cognitive science calls this **procedural memory**—the kind of memory that lets you ride a bike without thinking about it. In agent systems, experiential memory operates at four levels of abstraction, and the progression is genuinely interesting:

- **Case-based:** Store raw trajectories. "User asked X, I tried approach Y, it failed with error Z, I tried approach W, it worked." [ExpeL](https://arxiv.org/abs/2308.10144) (Zhao et al., 2024), Memento, and [JARVIS-1](https://arxiv.org/abs/2311.05997) all take this approach. You get high fidelity—the full record of what happened—but poor generalization and expensive context consumption. Replaying a 200-step trajectory to avoid a mistake on step 47 is wasteful.
- **Strategy-based:** Distill insights and workflows from raw experience. "When encountering connection timeout errors, check the connection pool configuration first—retry logic is usually a red herring." [Agent Workflow Memory](https://arxiv.org/abs/2409.07429) (AWM), [Reflexion](https://arxiv.org/abs/2303.11366), [Buffer of Thoughts](https://arxiv.org/abs/2406.04271), and R2D2 operate here. The strategies transfer across tasks—an insight about debugging connection issues applies to any project, not just the one where you learned it. Three granularities emerge: atomic insights (single observations), sequential workflows (step-by-step procedures), and schematic patterns (high-level templates).
- **Skill-based:** Compile strategies into executable code. The agent literally writes reusable tools for itself. [Voyager](https://arxiv.org/abs/2305.16291)'s JavaScript skill library for Minecraft is the canonical example—the agent discovers how to mine iron, writes a `mineIron()` function, and calls it directly next time instead of re-deriving the procedure. [SkillWeaver](https://arxiv.org/abs/2503.07413), Alita, and LEGOMem extend this to other domains. You could even frame MCP tool generation as skill-based memory—the agent creates tools it can invoke later.
- **Hybrid:** Combine levels. ExpeL stores both trajectories _and_ extracted insights. G-Memory gradually compiles frequent successes into executable skills. Memp distills gold trajectories into abstract procedures. The strongest systems don't pick one level—they maintain multiple simultaneously and use the right abstraction for the right retrieval context.

Two patterns from recent work stand out. The **Agentic Context Engineering (ACE)** pattern uses a three-agent loop—Generator, Reflector, Curator—to evolve a "context playbook" of learned strategies. It showed a +10.6% improvement on agent benchmarks without any fine-tuning, purely through better context management. The **Dynamic Cheatsheet** approach prevents redundant computation by storing accumulated strategies and problem-solving insights for immediate reuse at inference time. Both are forms of experiential memory that operate entirely at the token level—no weight updates needed.

I think experiential memory is where the biggest gap between current agent implementations and what's possible lives. Most agents I've built or used have factual memory (or at least attempt it). Almost none of them systematically learn from their own successes and failures. Every debugging session starts from scratch.

### Working memory: "What is the agent thinking about right now?"

Working memory isn't about what's stored long-term—it's about what's in the prompt _right now_. Baddeley's working memory model from cognitive science describes it as capacity-limited, dynamically controlled, and essential for higher-order cognition. The agent equivalent is the context window, but with an important distinction: a context window is a passive buffer by default. **Working memory** actively controls what's in it.

For single-turn interactions, working memory is mostly about compression—fitting massive inputs into the context window. [LLMLingua](https://arxiv.org/abs/2310.05736) compresses prompts by dropping low-perplexity tokens. Gist tokens (mentioned in the latent memory section) compress input into a handful of learned representations. Observation abstraction converts raw HTML into structured state descriptions—[Synapse](https://arxiv.org/abs/2306.07863) does this for web agents, turning a full DOM into a compact representation of what's actually on screen.

For multi-turn interactions—which is where persistent agents live—working memory gets much harder:

- **State consolidation:** Periodically compress conversation history into a summary. This is what Claude Code does when it hits context limits—it compacts the conversation, and you see a `compact_boundary` marker in the message stream. MemAgent, MemSearcher, and [ReSum](https://arxiv.org/abs/2501.08478) all implement variations. The risk is losing detail that turns out to matter later.
- **Hierarchical folding:** Decompose tasks into subtasks, fold completed subtask trajectories into summaries, keep only the active subtask in full detail. [HiAgent](https://arxiv.org/abs/2501.15641), Context-Folding, and AgentFold take this approach. It's elegant because completed work gets compressed while active work stays at full resolution.
- **Cognitive planning:** Maintain an externalized plan as the core of working memory, rather than raw conversation history. [PRIME](https://arxiv.org/abs/2502.10990), [SayPlan](https://arxiv.org/abs/2308.06391), KARMA, and [Agent-S](https://arxiv.org/abs/2410.08164) structure working memory around "what am I trying to accomplish and what's my next step?" rather than "what has been said so far." I find this approach particularly compelling because it mirrors how I actually think when working on a complex task—I don't replay the full conversation history in my head, I check my mental model of the plan and figure out what's next.

## The dynamics lifecycle: how memory operates

The third axis is where the rubber meets the road. Forms tells you where memory lives. Functions tells you why you need it. Dynamics tells you how to _operate_ it—how memories get created, maintained, and retrieved over time. This is also where the most practical engineering decisions live.

### Formation: what to store

When something happens that the agent might want to remember, how do you turn it into a memory entry? Five strategies, from simplest to most aggressive:

**Semantic summarization** compresses content to its gist. You take a conversation or document and produce a shorter version that captures the key points. There are two flavors: _incremental_ (update a running summary with each new chunk—MemGPT and Mem0 do this) and _partitioned_ (divide content into segments and summarize each independently—MemoryBank, [ReadAgent](https://arxiv.org/abs/2402.09727), [LightMem](https://arxiv.org/abs/2501.06579) take this approach). Incremental risks semantic drift—the summary gradually loses fidelity as it gets updated over and over. Partitioned risks losing cross-partition dependencies—information that spans two segments might get lost because neither segment's summary captures the full picture.

**Knowledge distillation** extracts specific facts and insights rather than summarizing everything. [Think-in-Memory](https://arxiv.org/abs/2311.08719) (TiM), [RMM](https://arxiv.org/abs/2502.01070), ExpeL, and AWM all work this way. You don't produce a summary—you produce discrete facts: "User prefers dark mode." "The API rate limit is 100 requests per minute." "Debugging approach X worked for error type Y." More precise than summarization, but risks misextraction—the LLM might extract the wrong fact or miss an important one.

**Structured construction** builds graphs and trees from content. Zep builds a temporal knowledge graph where entities have timestamps and relationships evolve over time. A-Mem creates networked notes with explicit links between related concepts. [GraphRAG](https://arxiv.org/abs/2404.16130) uses community detection algorithms to identify clusters of related entities. [RAPTOR](https://arxiv.org/abs/2401.18059) builds recursive abstractive trees—leaf nodes are raw chunks, parent nodes are summaries of their children, and you can retrieve at any level of abstraction. Rich representations, but rigid—the schema decisions you make at construction time constrain what you can retrieve later.

**Latent representation** compresses content into dense vectors. [MemoryLLM](https://arxiv.org/abs/2402.04624) and AutoCompressor do this. Efficient in terms of storage, but opaque—you can't inspect what a latent vector "remembers."

**Parametric internalization** fine-tunes the model on the content. ROME and MEMIT edit specific facts directly into model weights. Permanent, but carries catastrophic forgetting risk—updating one fact can corrupt nearby facts.

These aren't mutually exclusive. The strongest systems do multiple simultaneously—store both the raw case _and_ the extracted insight, for example. ExpeL maintains both trajectories and distilled strategies. If you're building a production system, I'd start with knowledge distillation for discrete facts and semantic summarization for conversation context, and add structured construction only when you see specific retrieval needs that flat search can't meet.

### Evolution: how to maintain memory

Memories aren't static. New information arrives that contradicts old memories. Related memories should be merged. Low-value memories should be pruned to keep retrieval quality high. Three operations:

**Consolidation** merges related entries. At the simplest level, you detect near-duplicates and combine them (local, pairwise). At a more sophisticated level, you cluster related memories and produce summary entries for each cluster—[PREMem](https://arxiv.org/abs/2502.09834), CAM, and TiM do cluster-level consolidation. At the global level, frameworks like [MOOM](https://arxiv.org/abs/2502.09070) and AgentFold periodically restructure the entire memory store. The goal is to keep the memory store compact and retrieval-friendly without losing important information.

**Updating** resolves conflicts when new information contradicts existing memory. This is where things get subtle. If a user says "we switched from PostgreSQL to MySQL," you need to update the relevant memory—but do you delete the old one or mark it as superseded? Zep's approach is smart: soft-delete with timestamps rather than hard-delete. The old fact is still there for auditability, but it won't surface in retrieval. [LightMem](https://arxiv.org/abs/2501.06579) and MOOM use a dual-phase pattern: fast online writes that accept new information immediately, plus slow offline consolidation that resolves conflicts and merges related entries in the background. [Mem-α](https://arxiv.org/abs/2503.13790) goes further and trains an RL policy for update decisions—the system _learns_ when to update versus when to keep both versions.

**Forgetting** prunes low-value entries. Three signals inform what to forget: time decay (exponential, inspired by the Ebbinghaus forgetting curve—memories naturally fade), access frequency (LRU/LFU policies—rarely accessed memories get evicted), and semantic importance (LLM-judged value—ask the model "is this memory still useful?"). Fair warning: LRU-style forgetting can eliminate rare but essential long-tail knowledge. A memory that's accessed once per year might still be critical when it's needed. Pure frequency-based eviction is dangerous for specialized knowledge.

The field is progressing through three generations of evolution strategies: rule-based (hard-coded decay rates, fixed merge thresholds), LLM-assisted (use the model to judge what to merge, update, or forget), and RL-trained (train a policy that learns optimal memory management through experience). [Memory-R1](https://arxiv.org/abs/2504.01069) and Mem-α represent the RL-trained frontier. Most practical systems today are in the first or second generation, and honestly, LLM-assisted evolution is probably sufficient for most use cases.

One practical insight I keep coming back to: conflict detection at write time is underrated. When you're about to store a new memory, check for existing entries in the 0.6–0.9 cosine similarity range. Below 0.6, they're unrelated. Above 0.9, they're near-duplicates. But that middle range—similar topic, potentially different facts—is where interesting conflicts live. "The project uses PostgreSQL" at 0.75 similarity to "The project uses MySQL" is a conflict you want to surface, not silently resolve.

### Retrieval: how to access what you stored

Retrieval is where most people start thinking about memory systems, but it's actually the _last_ step in the lifecycle. And here's the meta-insight the survey drives home: retrieval quality is bounded by formation and evolution quality. You can build the most sophisticated retrieval pipeline in the world, but if what's stored is noisy, contradictory, or poorly structured, your retrievals will be noisy, contradictory, and poorly structured. Beyond a certain sophistication of retrieval pipeline, the leverage shifts to making what's stored cleaner.

That said, retrieval still matters enormously. Here's the four-step pipeline the survey describes, with the practical implications of each:

**Timing: don't always retrieve.** Not every query needs memory augmentation. Some agent systems let the model decide whether to retrieve—it can choose to call a "search memory" tool or not. A more sophisticated approach is the fast-slow pattern: generate a quick draft response, check confidence, retrieve only if the draft is insufficient. [ComoRAG](https://arxiv.org/abs/2502.14530) and PRIME implement variations of this. The benefit is obvious—unnecessary retrieval adds latency and can actually _hurt_ performance by injecting irrelevant context.

**Query construction: the query you have is probably wrong.** This is the step that made the biggest impression on me. Raw user queries are poor retrieval signals. The question "how do we handle authentication?" doesn't look anything like the stored memory "The project uses JWT tokens with a 24-hour expiry, validated by middleware in `auth.ts`." In embedding space, the question and the answer are farther apart than you'd want because they have fundamentally different shapes—one is interrogative and vague, the other is declarative and specific.

This is where HyDE comes in, and I want to give it its own section because the approach is counterintuitive enough to deserve a proper explanation.

**Strategy: go hybrid.** Once you have a good query (or a HyDE-generated hypothetical), the retrieval strategy matters. Hybrid retrieval—BM25 plus semantic embedding, optionally plus graph traversal—outperforms any single method. BM25 catches exact keyword matches (when the user says `auth.ts`, you want exact string matching). Semantic embedding catches paraphrases (when the user says "login system" and the memory says "authentication middleware"). Graph traversal catches multi-hop relationships (when answering "what API does the project use that's built by the company Steve used to work at?" requires chaining through multiple nodes).

**Post-processing: filter aggressively.** Rerank retrieved results with a cross-encoder or LLM-based relevance judge. Apply [MMR](https://en.wikipedia.org/wiki/Maximal_marginal_relevance) (Maximal Marginal Relevance) for diversity—you want the top-K results to cover different aspects of the query, not K slightly different versions of the same memory. And filter aggressively. Injecting ten marginally relevant memories into the context is worse than injecting three highly relevant ones. (I've learned this one the hard way. More context is not always better context.)

### HyDE: the counterintuitive retrieval trick

I've been fascinated by this approach since I first encountered it, and I think it deserves a longer explanation because the core insight runs against how most engineers think about search.

HyDE—Hypothetical Document Embeddings—comes from [Gao et al. (ACL 2023)](https://arxiv.org/abs/2212.10496), out of CMU and the University of Waterloo. Here's the problem it solves: in a typical RAG setup, you take the user's query, embed it, and use vector similarity to find relevant documents in your memory store. This works okay for simple lookups but falls apart for complex or abstract queries. Why? Because questions and answers don't look alike in embedding space. A question is interrogative and vague. A stored memory is declarative and specific. Their embeddings are farther apart than you'd want.

The fix is beautifully simple: ask the LLM the question _with no context_ and let it respond. Even if the response is completely wrong, the fabricated answer is likely to be _shaped_ like the real information in your memory store—which means its embedding will be closer to the real answer than the original question's embedding was.

Here's my overly-simplistic explanation. In a typical RAG, you take the prompt and use vector similarity to find relevant memories. With HyDE, you ask the LLM the question with no context and let it respond. Even if it's ✨completely wrong✨, the BS response it gives you is likely to be similar to the real information in your memory system—which means using the BS answer can be more effective for finding the right answer than using the prompt itself.

The counterintuitive part is that the fabricated answer doesn't need to be _correct_. "The project uses Python with Flask" and "The project uses TypeScript with Express" are neighbors in embedding space—they share the same declarative structure, the same semantic domain, the same answer-shape. The encoder's dense bottleneck filters out the specific (wrong) details and preserves the structural similarity. The original paper calls this the "dense bottleneck hypothesis."

In practice, the original paper generates 5 hypothetical documents at temperature 0.7 and averages their embeddings. For agent memory retrieval, even a single generation works well. The implementation is one LLM call before each retrieval. Use a small, fast model for the hypothetical—the answer doesn't need to be smart, it just needs to be answer-shaped. For hybrid search, combine the hypothetical with the original query for the BM25 leg so exact keyword matches from the original query are preserved.

When HyDE doesn't help: specific factual lookups where the query already contains exact matching terms ("what's in `auth.ts`?"), and very short keyword-like queries ("PostgreSQL version"). In those cases, the original query is already closer to the stored memory than any hypothetical would be.

### Multi-hop queries: the hard problem

Some questions can't be answered by any single memory entry. "What API does the project use that's built by the company Steve used to work at?" requires chaining through multiple entries: Steve's employment history → the company → their products → the current project's dependencies. No single fact contains the answer.

Here's the strategy spectrum, from cheapest to most complex:

**Iterative retrieval** is the simplest: retrieve once, read the results, extract new search terms from what you found, retrieve again. The agent does the chaining through its normal tool-calling loop. This requires zero changes to your storage layer—it's just the agent calling its memory search tool multiple times in a single turn. If you're building on top of a ReAct-style agent loop (and you probably are), this already works.

**Query expansion** generates multiple related queries from the original and merges results. "What API does the project use that Steve's old company built?" might expand to "Steve's previous employer," "APIs used in the project," "companies that build developer tools." This helps with rephrasing but has an important limitation: the expansion can only rephrase what's already in the query. It can't discover connected entities that exist only in the memory store. If the user doesn't mention the company name, query expansion can't find it.

**Enrichment at write time** extracts entities and connection hints when memories are first stored, adding them as metadata. When you store "Steve used to work at Temporal," you also tag it with entities: `{person: "Steve", company: "Temporal", relation: "former_employer"}`. This adds implicit connections without building a full graph. It's a pragmatic middle ground.

**Knowledge graph** is the full-power solution: entity-relationship triples with graph traversal. Zep, [Mem0g](https://arxiv.org/abs/2504.09413), and [AriGraph](https://arxiv.org/abs/2407.04363) all implement this. You can follow edges from "Steve" → "worked_at" → "Temporal" → "builds" → "Temporal SDK" → "used_by" → "current project." Knowledge graphs consistently win on multi-hop benchmarks. The trade-off is significant engineering commitment—building, maintaining, and querying a graph is a lot more work than maintaining a flat vector store.

**Hierarchical summaries** can sometimes resolve multi-hop queries as a side effect. If your consolidation process produces cluster summaries that happen to connect the relevant entities ("Steve, who previously worked at Temporal, contributed to the project's adoption of their SDK"), the multi-hop connection is already captured in a single retrievable entry. It's not reliable, but good consolidation practices help.

Honest assessment: for genuine multi-hop queries where the connecting entities aren't in the query, you really only have two reliable options. Let the agent loop (iterative retrieval) or build structural connections (knowledge graph). Everything in between helps with rephrasing but doesn't solve the fundamental problem of discovering entities you didn't know to ask about.

## Trustworthy memory: the part everyone skips

I almost skipped this section. It feels like the "security chapter" of a textbook that you flip past to get to the interesting stuff. But having now spent time building a memory system, I think the trust and safety properties of agent memory are genuinely load-bearing, and most implementations get them wrong—or don't think about them at all.

The survey's framing is blunt: "as LLM agents begin to operate in persistent, open-ended environments, trustworthy memory will not just be a desirable feature—but a foundational requirement for real-world deployment."

### The multi-tenancy problem

Agent memory stores user-specific, persistent, potentially sensitive content. In a multi-tenant system—which is what you're building if more than one person uses your agent—one user's memories must not be accessible to another. This sounds obvious. It's not obvious in practice.

Research shows that memory modules can leak private data through indirect prompt-based attacks. The attacker doesn't need access to the storage layer. They craft prompts that cause the agent to surface another user's memorized data through the model's responses. If your memory retrieval path doesn't enforce strict tenant isolation at the retrieval level—not just at the storage level—you have a data leak waiting to happen.

Namespace filtering in application code is not real isolation. If the underlying storage has all tenants' data in one collection and the boundary is enforced by a metadata filter on queries, a bug in the filter leaks everything. I've seen this pattern in production systems, and it makes me nervous every time.

Three levels of defense, from weakest to strongest:

- **Application-level:** Namespace wrappers that enforce tenant boundaries regardless of what the caller passes. The wrapper overwrites any namespace the caller provides with the configured tenant namespace. This prevents accidental cross-tenant queries but doesn't protect against storage-level bugs.
- **Storage-level:** Separate databases (or collections, or indexes) per tenant. Simplest strong isolation. Per-tenant backup/restore and deletion ("forget everything about this user") come for free. This is what I'd recommend for most systems.
- **Encryption-level:** Per-tenant encryption keys. Even if someone gets raw storage access, they can't read another tenant's data without the key. The gold standard for sensitive deployments, but adds key management complexity.

### Shared caches are a leak surface

This one is subtle and I've never seen it discussed outside of the survey. If you cache embeddings keyed by content hash—which is a reasonable optimization—and you don't include the tenant namespace in the cache key, cache hits can cross tenants. User A stores a memory, the embedding gets cached. User B stores a similar memory, the cache returns User A's embedding. The embedding itself doesn't contain User A's data directly, but timing attacks and cache probing can leak information.

Similarly, if you batch embedding calls and mix content from different tenants in the same batch, the embedding provider can theoretically correlate them.

The fix is straightforward: incorporate the tenant namespace into cache keys. Provide per-namespace cache eviction. Batch embeddings per-tenant, not across tenants.

### The right to be forgotten

If a user asks to delete their data, can you guarantee it's gone? Under GDPR Article 17 (Right to Erasure) and CCPA deletion rights, you may be legally required to guarantee it.

The cascade problem makes this harder than it sounds. Deleting the storage entries is step one. But what about the full-text search indexes that contain their data? The embedding caches? The consolidated summaries that reference their memories? The experiential memories derived from interactions with them? A memory that says "when User X asks about feature Y, approach it this way" contains information _about_ User X even though it looks like an agent strategy.

Zep's approach—soft-delete with timestamps rather than hard-delete—preserves auditability while making data inaccessible. The data still exists in storage but is excluded from all retrieval paths. This gives you a window for complete physical deletion while immediately removing the data from the agent's accessible memory.

### The three pillars of trust

The survey frames trustworthy memory around three pillars, and I think the framing is worth internalizing even if you don't implement all of it:

**Privacy:** Granular permissioned memory (some memories are shareable, others aren't), user-governed retention policies (let users control how long their data is kept), encrypted and isolated storage, memory redaction (strip PII before storing). The practical minimum is tenant isolation and user-controlled deletion. Everything beyond that is defense in depth.

**Explainability:** Traceable access paths (which memories contributed to this response?), self-rationalizing retrievals (why were these memories chosen?), counterfactual reasoning ("what would have changed without this memory?"). Most of this is research-grade, but retrieval logging—recording which memories were retrieved for each response—is practical today and invaluable for debugging.

**Hallucination robustness:** Conflict detection (do retrieved memories contradict each other?), uncertainty-aware generation (abstain when retrieval confidence is low), multi-document reasoning (synthesize across multiple memories rather than trusting any single one). The practical version of this is simple: if your retrieval returns conflicting memories, surface the conflict to the user rather than silently picking one.

## Research frontiers: where this is all heading

The core of this post has been about what you can build today. This section is about where the research is pointing, and a few of the directions are genuinely exciting even if they're not production-ready yet.

### RL-driven memory management

The progression is clear: we've gone from rule-based memory management (hard-coded decay rates, fixed merge thresholds) to LLM-assisted (use the model to judge what to keep and what to forget) and we're now entering RL-driven territory. [Memory-R1](https://arxiv.org/abs/2504.01069) and [Mem-α](https://arxiv.org/abs/2503.13790) train RL policies that learn optimal memory operations through experience—when to store, when to consolidate, when to forget.

The deeper argument is provocative: human-inspired memory taxonomies (episodic, semantic, procedural—borrowed from Tulving's cognitive science work) may not be optimal for artificial agents. We inherited these categories because they describe how human brains work, but there's no reason to believe they're the best organization for a system with fundamentally different constraints—unlimited patience, perfect recall of what it _does_ store, no emotional salience signal. Let the agent invent its own memory structures through optimization. [MemEvolve](https://arxiv.org/abs/2502.08413) is a meta-evolutionary framework that jointly evolves both the agents' knowledge and their memory architecture.

I find this compelling and a little unsettling. The memory taxonomies feel natural because they map to how we think about our own memory. But "feels natural" isn't the same as "is optimal."

### Memory generation versus memory retrieval

Instead of retrieving stored entries, what if the agent could _generate_ context-specific memory on the fly? Rather than looking up "what do I know about this user's project," the agent synthesizes a relevant context summary from compressed representations. The survey argues latent memory—those compressed vector representations I described earlier—is the most promising technical path for this.

This would be a genuine paradigm shift. Today's retrieval pipeline—query → embed → search → rank → inject—would be replaced by something closer to: compressed state → generate relevant context → inject. The retrieved context would be tailored to the current query rather than being a pre-existing entry that happens to match. It's early days, but the direction is worth watching.

### Multi-agent shared memory

As agent architectures move from single-agent to multi-agent, memory sharing becomes a first-class problem. The progression mirrors distributed systems generally: isolated local memories with message passing → centralized shared stores ([MetaGPT](https://github.com/geekan/MetaGPT)'s shared message pool) → the future of agent-aware shared memory with role-based access control and learned synchronization policies.

The challenges are familiar to anyone who's built distributed systems: consistency (do all agents see the same memory state?), isolation (can one agent's bad memory corrupt another's?), and coordination (when two agents want to update the same memory simultaneously, who wins?). These are solved problems in database engineering but new problems in the context of LLM agents, because the "data" is unstructured text with semantic meaning that doesn't have natural primary keys or merge functions.

### The ontological question

I'll end the frontiers section with something that most engineering papers don't ask. The ["Animesis"](https://arxiv.org/abs/2503.16667) paper from March 2026 asks: as agents become persistent and autonomous, what does memory _mean_ for a digital being?

Current work answers "what memory does"—stores facts, enables retrieval, supports learning. But it doesn't answer "what memory is" in a deeper sense. As agent lifecycles extend from minutes to months—and they are extending, with persistent sessions, scheduled tasks, and always-on infrastructure—the assumption that memory is just a tool for the agent to use starts to break down. Is an agent with a rich memory of a user's preferences, communication style, and project history fundamentally different from an agent without one? Not in capability, but in kind?

I don't have an answer. I'm not sure the question has a clean answer. But I think it's worth sitting with, because the systems we're building now—the memory stores, the retrieval pipelines, the evolution strategies—are the substrate on which that question will eventually matter.

## What this means in practice

Here's where I land after reading through the research and building against some of these ideas.

For practitioners building memory systems today, the actionable path is clear: master token-level memory with a strong retrieval pipeline. That means hybrid search (BM25 plus semantic embeddings), HyDE for query construction, MMR for diversity, temporal decay for freshness, and aggressive post-retrieval filtering. Start flat. Move to graphs or hierarchies only when you observe specific failures that flat retrieval can't solve.

Add experiential memory to close the learning loop. Your agent should remember _how_ it solved problems, not just what facts it knows. Even a simple strategy store—"approaches that worked for error type X"—can meaningfully reduce the number of times your agent re-derives the same solution.

Take multi-tenancy seriously from the start. Retrofitting tenant isolation into a memory system that was designed as single-tenant is painful. Per-tenant storage is cheap. Cross-tenant data leaks are not.

The gap between research and production is real, but the most impactful improvements are often the simplest. Better query construction (HyDE) matters more than a fancier vector index. Conflict detection at write time matters more than a more sophisticated retrieval ranker. Background consolidation that merges near-duplicate memories matters more than a hierarchical memory architecture.

Memory isn't an auxiliary feature you bolt onto an agent after the core loop works. It's the substrate that turns a stateless language model into something that improves over time. Every agent you've used that felt genuinely helpful—that remembered your preferences, learned from its mistakes, maintained context across sessions—had a memory system doing the heavy lifting. Every agent that felt frustrating—that asked the same questions twice, forgot what you told it yesterday, repeated the same mistakes—didn't. The difference is the memory.
