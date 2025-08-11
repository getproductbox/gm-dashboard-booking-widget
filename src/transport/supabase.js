(function(root){
  let supabaseClient = null;

  async function ensureSupabaseClient(config) {
    if (supabaseClient) return supabaseClient;
    if (root.supabase && typeof root.supabase.createClient === 'function') {
      supabaseClient = root.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
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
    if (!root.supabase || !root.supabase.createClient) {
      throw new Error('Supabase client not available after loading script');
    }
    supabaseClient = root.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabaseClient;
  }

  root.GMTransport = root.GMTransport || {};
  root.GMTransport.ensureSupabaseClient = ensureSupabaseClient;
})(typeof window !== 'undefined' ? window : this);


