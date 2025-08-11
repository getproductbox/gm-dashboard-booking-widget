(function(root){
  async function ensureClient(config) {
    return root.GMTransport.ensureSupabaseClient(config);
  }

  async function fetchKaraokeVenueSlots(config, { venue, bookingDate, minCapacity, granularityMinutes = 60 }) {
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-availability', {
      body: { venue, bookingDate, minCapacity, granularityMinutes }
    });
  }

  async function fetchKaraokeBoothsForSlot(config, { venue, bookingDate, startTime, endTime, minCapacity }) {
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-availability', {
      body: { action: 'boothsForSlot', venue, bookingDate, startTime, endTime, minCapacity }
    });
  }

  async function karaokeCreateHold(config, { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes = 10 }) {
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'create' },
      body: { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes }
    });
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
    const supabase = await ensureClient(config);
    return supabase.functions.invoke('karaoke-book', {
      body: { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }
    });
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


