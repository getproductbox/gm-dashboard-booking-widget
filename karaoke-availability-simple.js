import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info, x-action'
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  const url = new URL(req.url);
  let action = req.headers.get('x-action') || url.searchParams.get('action') || '';

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    console.log('Request body:', body);
    if (!action && body?.action) action = body.action;
    
    if (action === 'boothsForSlot') {
      // Return individual booths for a specific time slot
      if (!body.venue || !body.bookingDate || !body.startTime || !body.endTime || !body.minCapacity) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: venue, bookingDate, startTime, endTime, minCapacity'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const { venue, bookingDate, startTime, endTime, minCapacity } = body;
      
      // Get all booths for this venue and capacity
      const { data: allBooths, error: boothsError } = await supabase
        .from('karaoke_booths')
        .select('id, name, capacity, hourly_rate, operating_hours_start, operating_hours_end')
        .eq('venue', venue)
        .gte('capacity', minCapacity)
        .eq('is_available', true);
      
      if (boothsError) {
        return new Response(JSON.stringify({
          error: boothsError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Filter booths that are operating during this time slot
      const startHour = parseInt(startTime.split(':')[0]);
      const availableBooths = (allBooths || []).filter(booth => {
        const boothStartHour = parseInt(booth.operating_hours_start?.split(':')[0] || '10');
        const boothEndHour = parseInt(booth.operating_hours_end?.split(':')[0] || '23');
        return startHour >= boothStartHour && startHour < boothEndHour;
      });
      
      // Get holds for this time slot
      const { data: holds, error: holdsError } = await supabase
        .from('karaoke_booth_holds')
        .select('booth_id')
        .eq('venue', venue)
        .eq('booking_date', bookingDate)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());
      
      if (holdsError) {
        return new Response(JSON.stringify({
          error: holdsError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Get bookings for this time slot
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('karaoke_booth_id')
        .eq('venue', venue)
        .eq('booking_date', bookingDate)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .neq('status', 'cancelled')
        .not('karaoke_booth_id', 'is', null);
      
      if (bookingsError) {
        return new Response(JSON.stringify({
          error: bookingsError.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Get booked booth IDs
      const bookedBoothIds = new Set([
        ...(holds || []).map(h => h.booth_id),
        ...(bookings || []).map(b => b.karaoke_booth_id)
      ]);
      
      // Filter out booked booths
      const finalAvailableBooths = availableBooths.filter(booth => !bookedBoothIds.has(booth.id));
      
      return new Response(JSON.stringify({
        success: true,
        availableBooths: finalAvailableBooths
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Default action: return available time slots
    if (!body.venue || !body.bookingDate || !body.minCapacity) {
      console.error('Missing required fields:', { venue: !!body.venue, bookingDate: !!body.bookingDate, minCapacity: !!body.minCapacity });
      return new Response(JSON.stringify({
        error: 'Missing required fields: venue, bookingDate, minCapacity'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    const { venue, bookingDate, minCapacity } = body;
    
    // Get all booths for this venue with their operating hours
    console.log('Fetching booths for venue:', venue, 'minCapacity:', minCapacity);
    const { data: booths, error: boothsError } = await supabase
      .from('karaoke_booths')
      .select('id, name, capacity, hourly_rate, operating_hours_start, operating_hours_end')
      .eq('venue', venue)
      .gte('capacity', minCapacity)
      .eq('is_available', true);
    
    if (boothsError) {
      console.error('Error fetching booths:', boothsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch booths',
        details: boothsError.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Found booths:', booths?.length || 0);
    
    if (!booths || booths.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        slots: []
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Generate time slots based on booth operating hours
    const allSlots = new Map(); // key: "startTime-endTime", value: { startTime, endTime, available, boothCount, capacities }
    
    for (const booth of booths) {
      const startHour = parseInt(booth.operating_hours_start?.split(':')[0] || '10');
      const endHour = parseInt(booth.operating_hours_end?.split(':')[0] || '23');
      
      console.log(`Booth ${booth.name}: ${startHour}:00 - ${endHour}:00`);
      
      // Generate 60-minute slots for this booth's operating hours
      for (let hour = startHour; hour < endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
        const slotKey = `${startTime}-${endTime}`;
        
        if (!allSlots.has(slotKey)) {
          allSlots.set(slotKey, {
            startTime,
            endTime,
            available: false,
            boothCount: 0,
            capacities: []
          });
        }
        
        const slot = allSlots.get(slotKey);
        // Don't add capacities here - we'll add them after checking availability
        slot.boothCount++;
      }
    }
    
    // Check availability for each slot
    console.log('Checking availability for', allSlots.size, 'slots');
    const slots = [];
    
    for (const [slotKey, slot] of allSlots) {
      // Get holds for this time slot
      const { data: holds, error: holdsError } = await supabase
        .from('karaoke_booth_holds')
        .select('booth_id')
        .eq('venue', venue)
        .eq('booking_date', bookingDate)
        .eq('start_time', slot.startTime)
        .eq('end_time', slot.endTime)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString());
      
      if (holdsError) {
        console.error('Error fetching holds for slot', slotKey, ':', holdsError);
        continue;
      }
      
      // Get bookings for this time slot
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('karaoke_booth_id')
        .eq('venue', venue)
        .eq('booking_date', bookingDate)
        .eq('start_time', slot.startTime)
        .eq('end_time', slot.endTime)
        .neq('status', 'cancelled')
        .not('karaoke_booth_id', 'is', null);
      
      if (bookingsError) {
        console.error('Error fetching bookings for slot', slotKey, ':', bookingsError);
        continue;
      }
      
      // Get booked booth IDs
      const bookedBoothIds = new Set([
        ...(holds || []).map(h => h.booth_id),
        ...(bookings || []).map(b => b.karaoke_booth_id)
      ]);
      
      // Count available booths for this slot
      const availableBooths = booths.filter(booth => !bookedBoothIds.has(booth.id));
      const available = availableBooths.length > 0;
      
      // Update slot with availability info
      slot.available = available;
      slot.boothCount = availableBooths.length;
      
      // Only add capacities for booths that are actually available during this time slot
      if (available) {
        // Filter booths that are operating during this specific time slot
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const operatingBooths = availableBooths.filter(booth => {
          const boothStartHour = parseInt(booth.operating_hours_start?.split(':')[0] || '10');
          const boothEndHour = parseInt(booth.operating_hours_end?.split(':')[0] || '23');
          return startHour >= boothStartHour && startHour < boothEndHour;
        });
        
        slot.capacities = Array.from(new Set(operatingBooths.map(b => b.capacity))).sort((a, b) => a - b);
      } else {
        slot.capacities = [];
      }
      
      slots.push(slot);
    }
    
    // Sort slots by start time
    slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    console.log('Returning', slots.length, 'slots');
    
    return new Response(JSON.stringify({
      success: true,
      slots
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('karaoke-availability error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
