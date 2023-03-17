// Time API
import type { RequestHandler } from '@builder.io/qwik-city';
import { oneLine, stripIndent } from 'common-tags';
import { createParser } from 'eventsource-parser';

type Question = {
  question: string;
};

type Headers = {
  Authorization: string;
  'OpenAI-Organization': string;
  'Content-Type': 'application/json';
};

function apiHeaders(): Headers {
  return {
    Authorization: `Bearer ${import.meta.env.VITE_OPENAI_KEY}`,
    'OpenAI-Organization': import.meta.env.VITE_OPENAI_ORGANIZATION,
    'Content-Type': 'application/json',
  };
}

type Payload = {
  method: string;
  headers: Headers;
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

const descriptions = [
  `The City Club Hotel. The City Club Hotel is a New York City landmark that dates back to 1904 when it opened as a gentleman's club for discussing politics. Today, this intimate four-star hotel attracts discerning travelers with its convenient central location just two blocks from Times Square and Bryant Park and four blocks from Rockefeller Center. While the hotel does not have an on-site fitness center, guests do receive complimentary passes to the nearby New York Sports Club, which features a sauna, indoor pool, and fitness classes including martial arts, cycling, and aqua fitness. Visit DB 0rne in the hotel lobby to enjoy French-American cuisine by world-renowned chef Daniel Boulud, or dine on room service from the restaurant in the comfort of your suite.`,
  `Holiday Inn Club Vacations at Desert Club Resort. Stretch out in a spacious vacation villa just one block from the Las Vegas Strip at Holiday Inn Club Vacations at Desert Club Resort. Each one- or two- bedroom unit at this all-suite resort features a fully-equipped kitchen, laundry facilities, and a spacious living room for a cozy home away from home feel. Cool off with a refreshing dip in one of five heated pools, relax in the indoor or outdoor hot tub after enjoying the Las Vegas nightlife, or visit the activity center for video games, air hockey, and foosball. Free shuttle service is available to the Las Vegas Strip and Fremont Street, and guests who prefer to remain at the resort can dine on casual fare at Gold Mine Bar & Grill.`,
  `Universal's Hard Rock Hotel®. This massively upscale resort is a fun, funky, rock-and-roll themed hotel that offers front row access the Universal Orlando Resort™ theme parks. Flush with rock music memorabilia and modern amenities, the Universal's Hard Rock Hotel® is a mere five-minute walk from Universal Studios Florida™, Universal’s Islands of Adventure™ and the International Premium Outlets. Bringing the best for both crowds, kids will enjoy an arcade and pool with a sandy beach and waterslide. Meanwhile, adults will find resort-style pool, on-site dining and a Fender guitar library, for music aficionados (Fender guitars are available for the duration of your stay). Suites, of course, are spotless, spacious and packed with modern amenities.`,
  `Dream South Beach. Our highly sought after location at Collins Avenue and 11th Street places you at the heart of South Beach. Just steps from the sands of Miami Beach, you are in the prime location for the trendiest clubs, restaurants and prized shopping of Lincoln Road, Ocean Drive and Collins Avenue as well as being underneath HIGHBAR, a ‘70s-glam-inspired rooftop pool lounge that unifies locals and hotel guests for an unforgettable time. Whatever you decide to spend your time on, from enjoying a massage at Shala Spa, sipping tequila over taquitos Naked Taco, or enjoying a celebration, we know that the key to an unforgettable trip.`,
  `Waldorf Astoria Las Vegas. Elegance and excellence abound at the Waldorf Astoria Las Vegas, a non-gaming and non-smoking property situated on The Strip near all the action. Breathtaking views await you at check-in, as the Sky Lobby is perched on the 23rd floor. This hotel is only one of eight in the U.S. to achieve a triple Forbes Five Star award for its luxurious hotel, a stunning 2-story spa that revitalizes your five senses, and a signature restaurant called Twist, which features one-of-a-kind French cuisine. Other dining options include a bistro, tea lounge, bar, and poolside café. Champagne is also available anytime, thanks to a vending machine. Guests can spend the day relaxing in a rented poolside cabana, stocked with refreshments, sun care products, and other amenities."`,
];

function createPrompts(question: string): string[] {
  const prompts = descriptions.map((d) => {
    const p = `
    You are a friendly and professional travel agent trying to convice a customer to stay at the hotel given in the context.
    Write a recommendation for the hotel in the context, for the customer wanting to know """${question}""".
    The recommendation must be exactly 3 sentences long. The tone should be fun, exciting and tailored to the customer's question.
    Do not use the term 'perfect' in the first sentence of the recomendation.
    \n
     Context
     -------
     ${d}
  `;
    return oneLine(stripIndent(p));
  });
  return prompts;
}

export const onPost: RequestHandler = async ({ send, parseBody }) => {
  const { question } = (await parseBody()) as Question;
  console.log(question);
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const openAIResponse = await getResponse(
    createPayload(createPrompts(question))
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
