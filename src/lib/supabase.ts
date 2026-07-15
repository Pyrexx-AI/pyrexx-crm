import { createBrowserClient } from '@supabase/ssr';
import { logger } from './logger';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    logger.error('SupabaseClient', 'Missing Supabase Environment Variables!', {
      url: !!supabaseUrl,
      key: !!supabaseKey
    });
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseKey!
  );
}