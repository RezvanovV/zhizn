import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  throw new Error('Нет VITE_SUPABASE_URL или VITE_SUPABASE_PUBLISHABLE_KEY в web/.env');
}

// Сессия хранится в браузере, поэтому входить нужно один раз на устройстве
export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true },
});
