import { ensureSupabaseClient } from '../transport/supabase.js';

export async function fetchKaraokeVenueSlots(config, { venue, bookingDate, minCapacity, granularityMinutes = 60 }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-availability', {
    body: { venue, bookingDate, minCapacity, granularityMinutes }
  });
}

export async function fetchKaraokeBoothsForSlot(config, { venue, bookingDate, startTime, endTime, minCapacity }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-availability', {
    body: { action: 'boothsForSlot', venue, bookingDate, startTime, endTime, minCapacity }
  });
}

export async function karaokeCreateHold(config, { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes = 10 }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-holds', {
    headers: { 'x-action': 'create' },
    body: { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes }
  });
}

export async function karaokeReleaseHold(config, { holdId, sessionId }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-holds', {
    headers: { 'x-action': 'release' },
    body: { holdId, sessionId }
  });
}

export async function karaokeExtendHold(config, { holdId, sessionId, ttlMinutes = 10 }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-holds', {
    headers: { 'x-action': 'extend' },
    body: { holdId, sessionId, ttlMinutes }
  });
}

export async function karaokeFinalizeBooking(config, { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }) {
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-book', {
    body: { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }
  });
}

// UMD attach
if (typeof window !== 'undefined') {
  window.GMKaraokeAPI = {
    fetchKaraokeVenueSlots,
    fetchKaraokeBoothsForSlot,
    karaokeCreateHold,
    karaokeReleaseHold,
    karaokeExtendHold,
    karaokeFinalizeBooking,
  };
}


