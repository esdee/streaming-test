// Time page
import { component$ } from '@builder.io/qwik';

import { useStreamingRecommendations } from './hooks';

export default component$(() => {
  const url = '/api/time';
  const question = 'What is the best hotel for a kid friendly vacation?';
  const [recommendations, completed] = useStreamingRecommendations(
    url,
    question
  );

  return (
    <>
      {completed.value === true && <h1>DONE</h1>}
      <h4>{recommendations[0]}</h4>
      <h4>{recommendations[1]}</h4>
      <h4>{recommendations[2]}</h4>
      <h4>{recommendations[3]}</h4>
      <h4>{recommendations[4]}</h4>
    </>
  );
});
