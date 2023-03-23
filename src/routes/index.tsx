/// Application entry point
/// Returns hotels and recommendations for a given question

import {
  component$,
  useSignal,
  useStore,
  $,
  useVisibleTask$,
  type PropFunction,
} from '@builder.io/qwik';
import { server$ } from '@builder.io/qwik-city';
import { useStreamingRecommendations } from './hooks';
import { type Hotel, getHotelsForQuestion } from './hotel-data';

type ProcessState =
  | 'awaiting-question' // this is the initial state,
  | 'awaiting-hotels' // the question has been submitted, we are waiting for the hotels to be returned
  | 'awaiting-recommendations' // we have hotels, we are waiting for the recommendations to be returned
  | 'displaying-recommendations'; // all done, we are displaying the recommendations that were returned

type PageState = {
  hotels: Hotel[];
  processState: ProcessState;
  question: string;
  recommendations: string[];
  recommendationsURL: string;
};

const initialState: PageState = {
  processState: 'awaiting-question',
  question: '',
  hotels: [],
  recommendations: [],
  recommendationsURL: '/api/recommendations',
};

// Return the list of 5 most relevent hotels for a given question
export const getHotels = server$(async (question: string) => {
  const hotels = await getHotelsForQuestion(question);
  return { success: true, hotels };
});

// This is the main component that renders the page
export default component$(() => {
  const pageState = useStore<PageState>(initialState);

  // Callback when user submits a question
  const onGotQuestion = $(async (question: string) => {
    if (question.trim().length === 0) return;
    pageState.hotels = [];
    pageState.question = question;
    pageState.processState = 'awaiting-hotels';
    pageState.hotels = (await getHotels(pageState.question)).hotels;
  });

  // Callback when all the recommendations have been returned from OpenAI
  const onGotAllRecommendations = $(() => {
    pageState.processState = 'displaying-recommendations';
  });

  // Callback when user closes the recommendations list to submit a new question
  const onCloseRecommendations = $(() => {
    pageState.hotels = initialState.hotels;
    pageState.question = initialState.question;
    pageState.processState = initialState.processState;
    pageState.recommendations = initialState.recommendations;
  });

  return (
    <div class="main">
      <h1>ChatCierge</h1>
      {pageState.processState === 'awaiting-question' && (
        <Question onGotQuestion={onGotQuestion} />
      )}
      {pageState.processState === 'awaiting-hotels' && (
        <div class="loading">
          <h1>Getting recommendations</h1>
        </div>
      )}
      {pageState.hotels.length > 0 && (
        <Hotels
          hotels={pageState.hotels}
          onCloseRecommendations={onCloseRecommendations}
          onGotAllRecommendations={onGotAllRecommendations}
          question={pageState.question}
          recommendationsURL={pageState.recommendationsURL}
        />
      )}
    </div>
  );
});

type QuestionProps = {
  onGotQuestion: PropFunction<(question: string) => void>;
};

export const Question = component$(({ onGotQuestion }: QuestionProps) => {
  const question = useSignal('');
  const exampleQuestions = [
    'Best hotels for bachelor parties in Las Vegas?',
    'Best hotels for Harry Potter Fans?',
    'Best hotels for fine dining?',
    'Best hotels for pizza lovers?',
  ];

  return (
    <>
      <input
        class="question"
        value={question.value}
        autoFocus
        placeholder="e.g. Best hotels for pet lovers?"
        onInput$={(ev) => {
          question.value = (ev.target as HTMLInputElement).value;
        }}
        onKeyDown$={async (ev) => {
          if (ev.key === 'Enter') {
            await onGotQuestion(question.value.trim());
          }
        }}
      />
      <div class="example-questions">
        {exampleQuestions.map((exampleQuestion, i) => {
          return (
            <button
              key={i}
              onClick$={async () => {
                question.value = exampleQuestion;
                await onGotQuestion(exampleQuestion);
              }}
            >
              {exampleQuestion}
            </button>
          );
        })}
      </div>
    </>
  );
});

type HotelsProps = {
  hotels: Hotel[];
  onCloseRecommendations: PropFunction<() => void>;
  onGotAllRecommendations: PropFunction<() => void>;
  question: string;
  recommendationsURL: string;
};

export const Hotels = component$(
  ({
    hotels,
    onCloseRecommendations,
    onGotAllRecommendations,
    question,
    recommendationsURL,
  }: HotelsProps) => {
    const recommendations = useStore<string[]>(['', '', '', '', '']); // the maximum number of recommendations is 5
    const hotelUUIDs = hotels.map((hotel) => hotel.uuid);
    const isCompleted = useSignal(false);

    // We need to signal to the parent component that all the recommendations have been returned
    useVisibleTask$(({ track }) => {
      track(() => isCompleted.value);
      if (isCompleted.value === true) {
        onGotAllRecommendations();
      }
    });

    useStreamingRecommendations(
      recommendationsURL,
      question,
      hotelUUIDs,
      recommendations,
      isCompleted
    );

    return (
      <div class="hotels">
        <h3>{question}</h3>
        {hotels.map((hotel, index) => (
          /* Keep the key here to prevent JSX errors :(*/
          <div class="hotel" key={hotel.uuid}>
            <HotelDetail
              city={hotel.city}
              name={hotel.name}
              imageURL={hotel.imageURL}
              recommendation={recommendations[index]}
              suitenessURL={hotel.suitenessURL}
            />
          </div>
        ))}
        <button onClick$={onCloseRecommendations}>OK</button>
      </div>
    );
  }
);

type HotelDetailProps = Pick<
  Hotel,
  'city' | 'name' | 'imageURL' | 'suitenessURL'
> & {
  recommendation: string;
};

// This is a Lite component, it's purely a function that returns JSX
// https://qwik.builder.io/docs/components/lite-components/
export const HotelDetail = ({
  city,
  name,
  imageURL,
  recommendation,
  suitenessURL,
}: HotelDetailProps) => {
  return (
    <>
      <h4>
        <a href={suitenessURL} target="_blank">
          {name},{city}
        </a>
      </h4>
      <div>
        <img
          class="hotel-image"
          alt={name}
          src={imageURL}
          width="100"
          height="100"
        ></img>
      </div>
      <p class="recommendation">{recommendation}</p>
    </>
  );
};
