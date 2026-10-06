import { claudeSkillFrontmatterSchema, openaiConfigurationSchema } from '@lostgradient/skillset';

import { experiment } from './experiment';
import { sampleSkill } from './sample-skill';
import { blankDocument } from './skill-document';
import type { SkillOptions } from './skill-document';
import { analyzeSkill, readSkillFiles } from './workbench';
import type { PageServerLoad } from './$types';

export const prerender = true;

const { shape } = claudeSkillFrontmatterSchema;

/** The enum values, read from skillset's schemas so the page never needs zod. */
const options: SkillOptions = {
  context: [...shape.context.unwrap().options],
  shell: [...shape.shell.unwrap().options],
  effort: [...(shape.effort.unwrap().options[0]?.options ?? [])],
  // Codex also accepts uppercase aliases; offer the plain spellings.
  products: openaiConfigurationSchema.shape.policy
    .unwrap()
    .shape.products.unwrap()
    .element.options.filter((product) => product === product.toLowerCase()),
};

/**
 * Reads the sample through the same path a dropped file takes and checks it
 * for both targets, so the verdict and the exported file are in the HTML
 * before any script runs.
 */
export const load: PageServerLoad = () => {
  const loaded = readSkillFiles(
    {
      skill: { path: 'release-notes/SKILL.md', text: sampleSkill },
      openai: null,
      directoryName: null,
    },
    blankDocument(),
  );
  if (!loaded.ok) throw new Error(`The sample skill doesn't parse: ${loaded.message}`);

  const sample = loaded.document;

  return {
    title: experiment.title,
    description: experiment.description,
    options,
    sample,
    initial: { claude: analyzeSkill(sample, 'claude'), codex: analyzeSkill(sample, 'codex') },
  };
};
