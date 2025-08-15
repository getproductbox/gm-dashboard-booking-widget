(function(root){
  async function ensureClient(config) {
    return root.GMTransport.ensureSupabaseClient(config);
  }

  async function fetchKaraokeVenueSlots(config, { venue, bookingDate, minCapacity, granularityMinutes = 60 }) {
    const base = (config.apiEndpoint || '').replace(/\/$/, '');
    const endpointUrl = `${base}/karaoke-availability`;
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Fetching slots from:', endpointUrl);
    
    const res = await fetch(endpointUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({ venue, bookingDate, minCapacity, granularityMinutes })
    });
    
    let data = null;
    try { 
      data = await res.json(); 
    } catch (_) {}
    
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      throw err;
    }
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Slots response:', data);
    return { data, error: null };
  }

  async function fetchKaraokeBoothsForSlot(config, { venue, bookingDate, startTime, endTime, minCapacity }) {
    const base = (config.apiEndpoint || '').replace(/\/$/, '');
    const endpointUrl = `${base}/karaoke-availability`;
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Fetching booths from:', endpointUrl);
    
    const res = await fetch(endpointUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({ action: 'boothsForSlot', venue, bookingDate, startTime, endTime, minCapacity })
    });
    
    let data = null;
    try { 
      data = await res.json(); 
    } catch (_) {}
    
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      throw err;
    }
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Booths response:', data);
    return { data, error: null };
  }

  async function karaokeCreateHold(config, { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes = 10 }) {
    const base = (config.apiEndpoint || '').replace(/\/$/, '');
    const endpointUrl = `${base}/karaoke-holds`;
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Creating hold at:', endpointUrl);
    
    const res = await fetch(endpointUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'x-action': 'create'
      },
      body: JSON.stringify({ boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes })
    });
    
    let data = null;
    try { 
      data = await res.json(); 
    } catch (_) {}
    
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      throw err;
    }
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Hold created:', data);
    return { data, error: null };
  }

  async function karaokeReleaseHold(config, { holdId, sessionId }) {
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'release' },
      body: { holdId, sessionId }
    });
  }

  async function karaokeExtendHold(config, { holdId, sessionId, ttlMinutes = 10 }) {
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'extend' },
      body: { holdId, sessionId, ttlMinutes }
    });
  }

  async function karaokeFinalizeBooking(config, { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }) {
    const base = (config.apiEndpoint || '').replace(/\/$/, '');
    const endpointUrl = `${base}/karaoke-book`;
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Finalizing booking at:', endpointUrl);
    
    const res = await fetch(endpointUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({ holdId, sessionId, customerName, customerEmail, customerPhone, guestCount })
    });
    
    let data = null;
    try { 
      data = await res.json(); 
    } catch (_) {}
    
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      throw err;
    }
    
    if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke API] Booking finalized:', data);
    return { data, error: null };
  }

  root.GMKaraokeAPI = {
    fetchKaraokeVenueSlots,
    fetchKaraokeBoothsForSlot,
    karaokeCreateHold,
    karaokeReleaseHold,
    karaokeExtendHold,
    karaokeFinalizeBooking
  };
})(typeof window !== 'undefined' ? window : this);


