import FastGlob from 'fast-glob';
import { readFileSync, writeFileSync } from 'fs';
import matter from 'gray-matter';
import OpenAI from 'openai';

const openai = new OpenAI();

const files = FastGlob.sync('../content/**/*.md');

for (const file of files) {
  if (file.endsWith('_index.md')) continue;
  if (file.endsWith('/meta-orphaned.md')) continue;
  if (file.endsWith('/meta-broken.md')) continue;

  const content = readFileSync(file, 'utf-8');
  const { data } = matter(content);

  if (!data.description) {
    console.error(`Missing description in ${file}`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that provides Open Graph-friendly descriptions for Markdown files. Your responses should be no longer than 200 characters and should be only plain text.',
        },
        {
          role: 'user',
          content: `Please provide a description for the following file:\n\n${content}`,
        },
      ],
    });

    const description = response.choices[0].message.content.trim();
    const updated = matter.stringify(content, { ...data, description });
    writeFileSync(file, updated, 'utf-8');
    console.log(`Added description to ${file}`);
  }

  if (!data.title) {
    console.error(`Missing title in ${file}`);
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that provides titles for Markdown files. Your responses should be concise and relevant to the content.',
        },
        {
          role: 'user',
          content: `Please provide a title for the following file:\n\n${content}`,
        },
      ],
    });

    const title = response.choices[0].message.content.trim();
    const updated = matter.stringify(content, { ...data, title });
    writeFileSync(file, updated, 'utf-8');
    console.log(`Added title to ${file}`);
  }
}
