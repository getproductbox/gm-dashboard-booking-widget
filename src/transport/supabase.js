let supabaseClient = null;

export async function ensureSupabaseClient(config) {
  if (supabaseClient) return supabaseClient;
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabaseClient;
  }

  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load Supabase client'));
    document.head.appendChild(script);
  });
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('Supabase client not available after loading script');
  }
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

// UMD attach for direct browser use without bundler
if (typeof window !== 'undefined') {
  window.GMTransport = window.GMTransport || {};
  window.GMTransport.ensureSupabaseClient = ensureSupabaseClient;
}


