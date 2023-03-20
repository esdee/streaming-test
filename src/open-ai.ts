import { oneLine, stripIndent } from 'common-tags';
import { type ErrorWithMessage, getErrorMessage } from './error';

type Headers = {
  Authorization: string;
  'OpenAI-Organization': string;
  'Content-Type': 'application/json';
};

type Payload = {
  method: 'GET' | 'POST';
  headers: Headers;
  body?: string;
};

function apiHeaders(): Headers {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
    'OpenAI-Organization': import.meta.env.VITE_OPENAI_ORGANIZATION,
    'Content-Type': 'application/json',
  };
}

const BASE_URL = 'https://api.openai.com/v1/' as const;
type Path = 'completions' | 'embeddings' | 'models';

function getUrl(path: Path): string {
  return `${BASE_URL}${path}`;
}

export async function pingOpenAI(): Promise<boolean> {
  const url = getUrl('models');
  const payload = {
    method: 'GET',
    headers: apiHeaders(),
  };
  try {
    const response = await fetch(url, payload);
    return response.status === 200;
  } catch (error) {
    console.error('OpenAI ping error --\n', error, '\n---\n');
  }
  return false;
}

export type Embedding = number[];

export async function getEmbedding(
  text: string
): Promise<Embedding | ErrorWithMessage> {
  const input = oneLine(stripIndent(text.replace(/\n/g, '')));
  const url = getUrl('embeddings');
  const payload = {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ input: input, model: 'text-embedding-ada-002' }),
  };
  try {
    const response = await fetch(url, payload);
    const jsonData = await response.json();
    const embedding = jsonData.data[0].embedding;
    return embedding as Embedding;
  } catch (e) {
    console.error('OpenAI get embedding error --\n', e, '\n---\n');
    return {
      message: getErrorMessage(e),
      source: 'OpenAI:getEmbedding',
    };
  }
}

function createRecommendationsPayload(prompts: string[]): Payload {
  const maxTokens = 2500;
  const temperature = 0.7;
  const payload = {
    method: 'POST' as const,
    headers: apiHeaders(),
    body: JSON.stringify({
      frequency_penalty: 0,
      max_tokens: maxTokens,
      model: 'text-davinci-003',
      presence_penalty: 0,
      prompt: prompts,
      stream: true,
      temperature,
    }),
  };
  return payload;
}

export async function getCompletions(
  prompts: string[]
): Promise<Response | ErrorWithMessage> {
  const payload = createRecommendationsPayload(prompts);
  const url = getUrl('completions');
  try {
    const response = await fetch(url, payload);
    return response;
  } catch (error) {
    console.error('OpenAI get completions error --\n', error, '\n---\n');
    return {
      message: getErrorMessage(error),
      source: 'OpenAI:getCompletions',
    };
  }
}
