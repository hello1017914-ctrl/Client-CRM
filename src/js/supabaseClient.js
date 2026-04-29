import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const isConfigured = supabaseUrl && 
                     supabaseKey && 
                     (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://'));

if (!isConfigured) {
  console.warn('Supabase credentials missing or invalid. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your settings.');
}

// Ensure we have valid strings even if missing, to avoid constructor errors
export const supabase = isConfigured 
    ? createClient(supabaseUrl, supabaseKey) 
    : {
        from: () => ({
            select: () => ({ order: () => ({ data: [], error: { message: 'Supabase not configured' } }) }),
            insert: () => ({ error: { message: 'Supabase not configured' } }),
            update: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }) }),
            delete: () => ({ eq: () => ({ error: { message: 'Supabase not configured' } }), in: () => ({ error: { message: 'Supabase not configured' } }), neq: () => ({ error: { message: 'Supabase not configured' } }) }),
            on: () => ({ subscribe: () => ({}) })
        }),
        channel: () => ({ on: () => ({ subscribe: () => ({}) }) }),
        removeChannel: () => {}
    };
