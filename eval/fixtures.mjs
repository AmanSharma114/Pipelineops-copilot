import { readFile, readdir } from 'node:fs/promises';

// JSON files in this directory are labeled question sets.
export async function loadQuestions() {
  const directory = new URL('./', import.meta.url);
  const filenames = (await readdir(directory)).filter(name => name.endsWith('.json')).sort();
  const questions = [];
  for (const name of filenames) {
    const rows = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
    questions.push(...rows);
  }
  if (!questions.length) throw Error('No labeled questions found');
  return questions;
}
