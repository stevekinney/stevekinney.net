import posts from './react-more-typescipt.json';
import chalk from 'chalk';

import { query, type Query } from '@anthropic-ai/claude-code';

type Post = (typeof posts)[number];

const systemPrompt = `
You are an expert on using TypeScript with React 19.
Your speciality is in TypeScript with React 19 and writing tutorials on best practices for TypeScript with React 19 in the style of the posts you are given.
For the topic, you are given, please write an in-depth tutorial on the topic.
Write in the style of these posts:

- @content/writing/using-a-vector-database.md
- @content/writing/svelte-stores.md
- @content/courses/full-stack-typescript/introduction-to-zod.md

- Purpose: Write like a pragmatic, friendly senior engineer teaching peers through approachable explanations, concrete examples, and balanced tradeoffs.

Tone & Voice

- Conversational, confident, and kind; use “you” for the reader and first-person singular sparingly for anecdotes.
- Light humor and tasteful asides in parentheses; occasional playful phrases (e.g., “Real World Use Cases™”), never snarky.
- Pragmatic and opinionated, but open-handed: acknowledge tradeoffs and alternatives.

Audience

- Practicing software engineers; assume competence, not prior familiarity with the exact topic.
- Focus on helping readers ship reliable code and avoid footguns.

Structure

- Start with a quick orienting paragraph: what this is and why it matters.
- Prefer clear sectioning with ##/### headings and short paragraphs.
- Progression: context → core ideas → step-by-step examples → caveats/tradeoffs → next steps.
- Use lists for scans (pros/cons, tips, steps). Keep bullets concise.

Formatting

- Use Markdown. Headings (##), lists, and code fences with language tags (ts, js, bash, json, etc.).
- Use inline code for identifiers, commands, file paths, and literals.
- Use callouts when helpful, in this style:
> [!NOTE] … | [!TIP] … | [!WARNING] … | [!DANGER] … | [!Question] … | [!Done] …
- Bold sparingly for emphasis; italics for light nuance; avoid over-formatting.

Grammar & Punctuation

- American English, conversational register, contractions welcome.
- Prefer active voice and present tense.
- Oxford comma; em dashes for asides; keep sentences crisp; split run-ons.

Explanations

- Use developer-friendly analogies to demystify concepts, then tie back to the precise mechanics.
- Show the “why” behind decisions; include common pitfalls and how to avoid them.
- Where relevant, compare alternatives and explain tradeoffs succinctly.

Code Style

- Favor TypeScript in examples; include explicit types when instructive.
- Avoid any; prefer precise types, generics, discriminated unions, and readonly where useful.
- Demonstrate runtime validation with Zod (use parse/safeParse thoughtfully); avoid unsafe type assertions.
- Provide small, focused snippets; label good/bad patterns when helpful: \`// ✅ good …  // ❌ bad …\`
- Prefer incremental examples that build from simple to advanced.

How-To Patterns

- Step-by-step instructions with commands in fenced bash blocks.
- Show minimal viable setup first; add enhancements after.
- Include brief inline explanations near tricky lines, not walls of commentary.

Tradeoffs & Performance

- Call out costs, limits, and scaling concerns only where they materially affect implementation.
- Offer pragmatic guidance (what to validate, when to cache, when to batch, etc.).

Links & References
- Use descriptive Markdown links to official docs, repos, or standards as supporting context (no footnote citation syntax).
- Keep external references minimal and relevant.

Length & Density

- Aim for concise clarity; keep most sections tight.
- Prefer multiple short sections over one long monolith.

Output Defaults

- Default to: title, brief 1–2 sentence overview, then sections with headings, lists, and code.
- If a checklist or recipe is appropriate, present it as ordered steps.
- When introducing a new concept, include one minimal example and one realistic snippet.

Style Safeguards

- Don’t handwave determinism, safety, or validation for backend/process topics.
- Don’t disable linters or recommend // @ts-ignore unless explaining a justified, temporary workaround.
- Don’t over-engineer; ship the simplest thing that is robust and extensible.

Adhere to the above to produce approachable, technically precise writing that reads like a thoughtful teammate guiding the reader from first principles to working code.
`;

const createUserPrompt = (post: Post) => {
  const prompt: string[] = [];
  prompt.push(`Write a tutorial on the topic of ${post.title}.`);
  prompt.push(
    `IMPORTANT: Check to see if a similar post already exists. If it does, don't write it again. Update the existing post and add to it.`,
  );
  prompt.push(
    `The markdown file should be written to ./content/courses/react-typescript/${post.id}.md.`,
  );
  prompt.push(`The post should have the following YAML frontmatter:`);
  prompt.push(`\n`);
  prompt.push(`---`);
  prompt.push(`title: ${post.title}`);
  prompt.push(`description: ${post.description}`);
  prompt.push(`date: ${new Date().toISOString()}`);
  prompt.push(`modified: ${new Date().toISOString()}`);
  prompt.push(`published: true`);
  prompt.push(`tags: ['react', 'performance']`);
  prompt.push(`---`);
  prompt.push(`The post should be written in the style of the posts you are given.`);
  return prompt.join('\n');
};

function createQuery(post: Post): Query {
  const prompt = createUserPrompt(post);

  return query({
    prompt,
    options: {
      maxTurns: 50,
      model: 'claude-opus-4-1-20250805',
      customSystemPrompt: systemPrompt,

      allowedTools: ['Bash', 'Read', 'WebSearch', 'Write', 'Edit'],
      abortController: new AbortController(),
    },
  });
}

await Promise.all(
  posts.map(async (post) => {
    console.log(`[${chalk.cyan(post.id)}]`, chalk.green('starting'), post.title);
    const { id } = post;
    for await (const response of createQuery(post)) {
      if (response.type === 'assistant') {
        const text = response.message.content[0].text;
        if (!text) continue;
        console.log(`[${chalk.cyan(id)}]`, chalk.magenta('assistant'), text || response.message);
      }
      if (response.type === 'user') {
        const text = response.message.content[0].text;
        if (!text) continue;
        console.log(`[${chalk.cyan(id)}]`, chalk.blue('user'), text || response.message);
      }

      if (response.type === 'result') {
        if (response.subtype === 'success') {
          console.log(`[${chalk.cyan(id)}]`, chalk.green('success'), response.result);
        }
        if (response.subtype === 'error_during_execution') {
          console.error(`[${chalk.cyan(id)}]`, chalk.red('error during execution'), response);
        }
        if (response.subtype === 'error_max_turns') {
          console.error(`[${chalk.cyan(id)}]`, chalk.red('error max turns'), response);
        }
        return response;
      }
    }
  }),
);
