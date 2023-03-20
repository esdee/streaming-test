/// Hotels page
/// Returns hotels and recommendations for a given question

import {
  type Signal,
  component$,
  useSignal,
  useStore,
  $,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { useStreamingRecommendations } from './hooks';
import { type Hotel, getHotelsForQuestion } from './hotel-data';

export const getHotels = server$(async (question: string) => {
  const hotels = await getHotelsForQuestion(question);
  return { success: true, hotels };
});

export default component$(() => {
  const question = useSignal<string>('');
  const hotels = useSignal<Hotel[]>([]);

  const submitQuestion = $(async () => {
    if (question.value.trim().length === 0) return;
    hotels.value = [];
    hotels.value = (await getHotels(question.value)).hotels;
  });

  return (
    <>
      <input
        value={question.value}
        autoFocus
        onInput$={(ev) => {
          const value = (ev.target as HTMLInputElement).value;
          question.value = value;
        }}
        onKeyDown$={(ev) => {
          if (ev.key === 'Enter') {
            submitQuestion();
          }
        }}
      />
      <h2>{question.value}</h2>
      {hotels.value && hotels.value.length > 0 && (
        <Hotels hotels={hotels} question={question.value} />
      )}
    </>
  );
});

type HotelsParams = {
  hotels: Signal<Hotel[]>;
  question: string;
};

export const Hotels = component$(({ question, hotels }: HotelsParams) => {
  const recommendations = useStore<string[]>(['', '', '', '', '']);
  const isCompleted = useSignal<boolean>(false);
  const url = '/api/recommendations';
  const hotelUUIDs = hotels.value.map((hotel) => hotel.uuid);

  useStreamingRecommendations(
    url,
    question,
    hotelUUIDs,
    recommendations,
    isCompleted
  );
  return (
    <>
      <ul>
        {hotels.value.map((hotel, index) => (
          <li>
            <h4>{hotel.name}</h4>
            <p>{recommendations[index]}</p>
          </li>
        ))}
      </ul>
      {isCompleted.value === true && <h1>DONE</h1>}
    </>
  );
});
