// Time API
import type { RequestHandler } from '@builder.io/qwik-city';

type Question = {
  question: string;
};

//GET
export const onRequest: RequestHandler = async ({ send, parseBody }) => {
  const { question } = (await parseBody()) as Question;
  const encoder = new TextEncoder();
  let count = 0;
  const stream = new ReadableStream({
    start(controller) {
      function send(data: string) {
        const encoded = encoder.encode(`${question}: ${count} ${data}`);
        controller.enqueue(encoded);
      }
      (function setup(sendingFn) {
        const timer = setInterval(() => {
          count++;
          if (count > 3) {
            try {
              controller.close();
            } catch (e) {
              console.error(e);
            }
            clearInterval(timer);
            return;
          } else {
            sendingFn(new Date().toISOString());
          }
        }, 1000);
        return function clear() {
          clearInterval(timer);
          try {
            controller.close();
          } catch (e) {
            console.error(e);
          }
        };
      })(send);
    },
  });

  const response = new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
  send(response);
};
