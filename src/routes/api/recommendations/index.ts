// Time API
import type { RequestHandler } from '@builder.io/qwik-city';
import { oneLine, stripIndent } from 'common-tags';
import { createParser } from 'eventsource-parser';
import { getHotelsFromUUIDs, type Hotel } from '~/routes/hotel-data';

// The client must send a list of hotel UUIDs and a question in order to get generated recommendations.
type RecommendationParams = {
  hotelUUIDs: string[];
  question: string;
};

// Compulsory headers for OpenAI API
type OpenAIHeaders = {
  Authorization: string;
  'OpenAI-Organization': string;
  'Content-Type': 'application/json';
};

function apiHeaders(): OpenAIHeaders {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
    'OpenAI-Organization': import.meta.env.VITE_OPENAI_ORGANIZATION as string,
    'Content-Type': 'application/json',
  };
}

type Payload = {
  method: string;
  headers: OpenAIHeaders;
  body: string;
};

function createPayload(prompts: string[]): Payload {
  const maxTokens = 2500;
  const temperature = 0.7;
  const payload = {
    method: 'POST',
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

async function getResponse(payload: Payload): Promise<Response> {
  const url = 'https://api.openai.com/v1/completions';
  const response = await fetch(url, payload);
  return response;
}

// A prompt consists of
// Some direction to OpenAI's completion model, the customer's question
// and a context, which is name + description for each hotel.
function createPrompts(question: string, hotels: Hotel[]): string[] {
  const prompts = hotels.map((h) => {
    const p = `
    You are a friendly and professional travel agent trying to convice a customer to stay at the hotel given in the context.
    Write a recommendation for the hotel in the context, for the customer wanting to know """${question}""".
    The recommendation must be exactly 3 sentences long. The tone should be fun, exciting and tailored to the customer's question.
    Do not use the term 'perfect' in the first sentence of the recomendation.
    \n
     Context
     -------
     ${h.name}.${h.description}
  `;
    return oneLine(stripIndent(p));
  });
  return prompts;
}

export const onPost: RequestHandler = async ({ send, parseBody }) => {
  const { question, hotelUUIDs } = (await parseBody()) as RecommendationParams;
  const hotels = await getHotelsFromUUIDs(hotelUUIDs);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const openAIResponse = await getResponse(
    createPayload(createPrompts(question, hotels))
  );
  let count = 0;

  const stream = new ReadableStream({
    async start(controller) {
      function onParse(event: any) {
        if (event.type === 'event') {
          const data = event.data;
          // https://beta.openai.com/docs/api-reference/completions/create#completions/create-stream
          if (data === '[DONE]') {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const { text, index } = json.choices[0];
            // Starts with a ssequence of /ns which we can ignore
            if (text !== '\n') {
              count++;
            }
            // Now we have real text that is part of the recommendation
            if (count > 0) {
              const packet = { text, index };
              const queue = encoder.encode(JSON.stringify(packet));
              controller.enqueue(queue);
            }
          } catch (e) {
            controller.error(e);
          }
        }
      }

      const parser = createParser(onParse);
      for await (const chunk of openAIResponse.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  const streamingResponse = new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
  send(streamingResponse);
};
