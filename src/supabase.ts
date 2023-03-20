import {
  createClient,
  type PostgrestSingleResponse,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { type ErrorWithMessage, getErrorMessage } from './error';

export function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;
  const client = createClient(supabaseUrl, supabaseKey);
  return client;
}

export async function pingSupabase(): Promise<boolean> {
  try {
    const supabase = createSupabaseClient();
    await supabase.from('searchables').select('*').limit(1);
    return true;
  } catch (e) {
    console.error('Supabase ping error --\n', e, '\n---\n');
  }
  return false;
}

export type RPC = 'get_hotels_for_question';

export async function executeRPC<T>(
  rpc: RPC,
  params: Record<string, any>
): Promise<T[] | ErrorWithMessage> {
  try {
    const supabase = createSupabaseClient();
    const { data, error, status } = await supabase.rpc(rpc, params);
    if (status != 200 || !!error) {
      console.error(
        `Supabase RPC<${rpc}> error 1 --\n ${JSON.stringify(error)} \n---\n`
      );
      return {
        message: getErrorMessage(error),
        source: `Supabase:executeRPC<${rpc}>`,
      };
    }
    return data as T[];
  } catch (error) {
    console.error(`Supabase RPC<${rpc}> error 2 --\n ${error} \n---\n`);
    return {
      message: getErrorMessage(error),
      source: `Supabase:executeRPC<${rpc}>`,
    };
  }
}

export function checkQueryResults<T>(
  { data, error, status }: PostgrestSingleResponse<T>,
  queryName: string
): T | ErrorWithMessage {
  if (status != 200 || !!error) {
    console.error(
      `Supabase query<${queryName}> error 1 --\n ${JSON.stringify(
        error
      )} \n---\n`
    );
    return {
      message: getErrorMessage(error),
      source: `Supabase:executeQuery<${queryName}>`,
    };
  }
  return data as T;
}
