// Time page
import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export default component$(() => {
  const time = useSignal<string>('<NULL>');

  useVisibleTask$(async () => {
    const response = await fetch('/api/time/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question: 'What is the answer to life, the universe, and everything?',
      }),
    });
    if (response.ok) {
      try {
        const responseBody = response.body;
        if (!responseBody) {
          return;
        }
        const reader = responseBody.getReader();
        const decoder = new TextDecoder();
        // @ts-ignore - function processTReam has return type any
        reader.read().then(function processStream({ done, value }) {
          if (done) {
            console.log('DONE');
            time.value = 'DONE';
            return;
          } else {
            const chunkValue = decoder.decode(value);
            time.value = chunkValue;
            return reader.read().then(processStream);
          }
        });
      } catch (e) {
        console.error('Error', e);
      }
    }
  });
  return (
    <>
      <h1>{time.value}</h1>
    </>
  );
});
