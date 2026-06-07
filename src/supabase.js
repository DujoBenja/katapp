import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// Supports the newer "publishable" key (sb_publishable_…) and the legacy "anon" key.
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly if env is missing so the cause is obvious during setup.
if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase config. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.'
  )
}

export const supabase = createClient(url ?? '', key ?? '')

// Name of the storage bucket that holds product images.
export const IMAGE_BUCKET = 'product-images'
