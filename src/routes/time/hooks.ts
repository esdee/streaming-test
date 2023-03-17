import {
  type Signal,
  useSignal,
  useStore,
  useVisibleTask$,
} from '@builder.io/qwik';

type IndexedText = {
  index: number;
  text: string;
};

function parseChunk(chunkValue: string): string[] {
  // chunkValue is a string that looks like this '{"index":0,"text":"Hello"}{"index":1,"text":"World"}'
  // or like this '{"index":0,"text":"Hello"}'
  const replaced = JSON.parse(
    `[${chunkValue.replaceAll('}{', '},{')}]`
  ) as IndexedText[];
  return replaced.reduce(
    (acc: string[], item: IndexedText) => {
      const text = item.text.replace(/\\n/g, '') + '';
      if (text.length > 0) {
        acc[item.index] = acc[item.index] + item.text;
      }
      return acc;
    },
    ['', '', '', '', '']
  );
}

async function getResponse(url: string | URL, question: string) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question }),
  });
  return response;
}

export function useStreamingRecommendations(
  url: string | URL,
  question: string
): [string[], Signal<boolean>] {
  const recommendations = useStore<string[]>(['', '', '', '', '']);
  const completed = useSignal<boolean>(false);

  useVisibleTask$(async () => {
    const response = await getResponse(url, question);
    if (response.ok) {
      try {
        const responseBody = response.body;
        if (!responseBody) {
          completed.value = true;
          return;
        }
        const reader = responseBody.getReader();
        const decoder = new TextDecoder();
        // @ts-ignore - function processTReam has return type any
        reader.read().then(function processStream({ done, value }) {
          if (done) {
            completed.value = false;
            return;
          } else {
            const chunkValue = decoder.decode(value);
            try {
              const newTexts = parseChunk(chunkValue);
              for (let i = 0; i < newTexts.length; i++) {
                recommendations[i] = recommendations[i] + newTexts[i];
              }
            } catch (e) {
              console.error(e, chunkValue);
            }
            return reader.read().then(processStream);
          }
        });
      } catch (e) {
        console.error('Error', e);
      }
    }
  });
  return [recommendations, completed];
}
