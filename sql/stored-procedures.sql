--- Stored Procedures used in the application

--- Function to return Hotels that match the given question
--- Hotels are ordered by similarity to the question
create or replace function get_hotels_for_question (
  question_embedding vector(1536),
  similarity_threshold float,
  match_count int
)
returns table (
  id bigint,
  uuid uuid,
  name text,
  description text,
  city_name text,
  local_image_url text,
  fallback_image_url text
)
language plpgsql
as $$
begin
  return query
  select
    h.id,
    h.uuid,
    h.name,
    h.description,
    h.city_name,
    h.local_image_url,
    h.fallback_image_url
  from contents c
  join hotels h on h.uuid = c.searchable_uuid
  where
    1 - (c.embedding <=> question_embedding) > similarity_threshold
  and
    c.content_type = 'hotel'
  order by c.embedding <=> question_embedding
  limit match_count;
end;
$$;
