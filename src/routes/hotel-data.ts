import { getEmbedding } from '~/open-ai';
import { isErrorWithMessage } from '~/error';
import { executeRPC } from '~/supabase';
import { checkQueryResults, createSupabaseClient } from '~/supabase';

type HotelDb = {
  id: number;
  uuid: string;
  name: string;
  description: string;
  city_name: string;
  local_image_url: string | null;
  fallback_image_url: string | null;
};

export type Hotel = Pick<HotelDb, 'id' | 'uuid' | 'name' | 'description'> & {
  city: string;
  imageUrl: string | undefined;
};

function hotelDataToHotel(hotelData: HotelDb): Hotel {
  const imageUrl = hotelData.local_image_url
    ? hotelData.local_image_url
    : hotelData.fallback_image_url
    ? hotelData.fallback_image_url
    : undefined;
  return {
    id: hotelData.id,
    uuid: hotelData.uuid,
    name: hotelData.name,
    description: hotelData.description,
    city: hotelData.city_name,
    // local images are hand selected and uploaaded so are preferred
    imageUrl: imageUrl,
  };
}

// Given a question, e.g. "What is the best hotel for pt lovers?",
// return a list of 5 hotels that best match the question.
export async function getHotelsForQuestion(question: string): Promise<Hotel[]> {
  const openAIResponse = await getEmbedding(question);
  if (isErrorWithMessage(openAIResponse)) {
    return [];
  }

  const supabaseResponse = await executeRPC<HotelDb>(
    'get_hotels_for_question',
    {
      question_embedding: openAIResponse,
      similarity_threshold: 0.75,
      match_count: 5,
    }
  );
  if (isErrorWithMessage(supabaseResponse)) {
    return [];
  }
  return supabaseResponse.map(hotelDataToHotel);
}

// Given a list of hotel UUIDs, return a list of hotels
// This can be used as context for OpenAI's GPT-3 model to generate recommendations.
export async function getHotelsFromUUIDs(
  hotelUUIDs: string[]
): Promise<Hotel[]> {
  const supabaseClient = createSupabaseClient();
  const supabaseResponse = await supabaseClient
    .from('hotels')
    .select(
      'id, uuid, name, description, city_name, local_image_url, fallback_image_url'
    )
    .in('uuid', hotelUUIDs);
  const checkedResponse = checkQueryResults<HotelDb[]>(
    supabaseResponse,
    'getHotelsFromUUIDs'
  );
  if (isErrorWithMessage(checkedResponse)) {
    return [];
  }
  // Ensure the order of the hotels matches the order of the UUIDs
  return hotelUUIDs.reduce((acc: Hotel[], hotelUUID) => {
    const hotel = checkedResponse.find((h) => h.uuid === hotelUUID);
    if (hotel) {
      return [...acc, hotelDataToHotel(hotel)];
    }
    return acc;
  }, []);
}
