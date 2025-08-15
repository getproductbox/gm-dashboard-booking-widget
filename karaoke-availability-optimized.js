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
    if (!action && body?.action) action = body.action;
    
    if (action === 'slots') {
      // Original slots endpoint - returns available time slots
      if (!body.venue || !body.bookingDate || !body.minCapacity) {
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
      
      const { venue, bookingDate, minCapacity, granularityMinutes = 60 } = body;
      
      // Generate time slots from 10:00 to 02:00 (next day)
      const timeSlots = [];
      for (let hour = 10; hour <= 23; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      timeSlots.push('00:00', '00:30', '01:00', '01:30', '02:00');
      
      // Check availability for each slot
      const slots = [];
      for (let i = 0; i < timeSlots.length - 1; i++) {
        const startTime = timeSlots[i];
        const endTime = timeSlots[i + 1];
        
        // Check if slot is available
        const { data: booths, error } = await supabase
          .from('karaoke_booths')
          .select('id, name, capacity, hourly_rate')
          .eq('venue', venue)
          .gte('capacity', minCapacity)
          .not('id', 'in', `(
            SELECT booth_id FROM karaoke_booth_holds 
            WHERE venue = '${venue}' 
            AND booking_date = '${bookingDate}' 
            AND start_time = '${startTime}' 
            AND end_time = '${endTime}' 
            AND status = 'active' 
            AND expires_at > NOW()
          )`)
          .not('id', 'in', `(
            SELECT booth_id FROM karaoke_bookings 
            WHERE venue = '${venue}' 
            AND booking_date = '${bookingDate}' 
            AND start_time = '${startTime}' 
            AND end_time = '${endTime}' 
            AND status != 'cancelled'
          )`);
        
        if (error) {
          console.error('Error checking slot availability:', error);
          continue;
        }
        
        const availableBooths = booths || [];
        const available = availableBooths.length > 0;
        const capacities = available ? Array.from(new Set(availableBooths.map(b => b.capacity))).sort((a, b) => a - b) : [];
        
        slots.push({
          startTime,
          endTime,
          available,
          capacities,
          boothCount: availableBooths.length
        });
      }
      
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
    }
    
    if (action === 'boothsForSlot') {
      // Original booth selection endpoint
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
      
      const { data: booths, error } = await supabase
        .from('karaoke_booths')
        .select('id, name, capacity, hourly_rate')
        .eq('venue', venue)
        .gte('capacity', minCapacity)
        .not('id', 'in', `(
          SELECT booth_id FROM karaoke_booth_holds 
          WHERE venue = '${venue}' 
          AND booking_date = '${bookingDate}' 
          AND start_time = '${startTime}' 
          AND end_time = '${endTime}' 
          AND status = 'active' 
          AND expires_at > NOW()
        )`)
        .not('id', 'in', `(
          SELECT booth_id FROM karaoke_bookings 
          WHERE venue = '${venue}' 
          AND booking_date = '${bookingDate}' 
          AND start_time = '${startTime}' 
          AND end_time = '${endTime}' 
          AND status != 'cancelled'
        )`);
      
      if (error) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        availableBooths: booths || []
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (action === 'capacitiesForSlots') {
      // 🚀 NEW OPTIMIZED ENDPOINT: Get capacities for multiple slots in one request
      if (!body.venue || !body.bookingDate || !body.minCapacity || !body.slots) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: venue, bookingDate, minCapacity, slots'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const { venue, bookingDate, minCapacity, slots } = body;
      
      // Validate slots format
      if (!Array.isArray(slots) || slots.length === 0) {
        return new Response(JSON.stringify({
          error: 'slots must be a non-empty array of {startTime, endTime} objects'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const slotCapacities = {};
      
      // Process slots in batches to avoid overwhelming the database
      const batchSize = 5;
      for (let i = 0; i < slots.length; i += batchSize) {
        const batch = slots.slice(i, i + batchSize);
        
        // Create a single query for the batch
        const slotConditions = batch.map(slot => 
          `(start_time = '${slot.startTime}' AND end_time = '${slot.endTime}')`
        ).join(' OR ');
        
        const { data: booths, error } = await supabase
          .from('karaoke_booths')
          .select('id, name, capacity, hourly_rate')
          .eq('venue', venue)
          .gte('capacity', minCapacity)
          .not('id', 'in', `(
            SELECT booth_id FROM karaoke_booth_holds 
            WHERE venue = '${venue}' 
            AND booking_date = '${bookingDate}' 
            AND (${slotConditions})
            AND status = 'active' 
            AND expires_at > NOW()
          )`)
          .not('id', 'in', `(
            SELECT booth_id FROM karaoke_bookings 
            WHERE venue = '${venue}' 
            AND booking_date = '${bookingDate}' 
            AND (${slotConditions})
            AND status != 'cancelled'
          )`);
        
        if (error) {
          console.error('Error checking batch availability:', error);
          continue;
        }
        
        // Group booths by slot
        const availableBooths = booths || [];
        for (const booth of availableBooths) {
          // For each booth, check which slots it's available for
          for (const slot of batch) {
            const slotKey = `${slot.startTime}-${slot.endTime}`;
            if (!slotCapacities[slotKey]) {
              slotCapacities[slotKey] = [];
            }
            slotCapacities[slotKey].push(booth.capacity);
          }
        }
      }
      
      // Convert to the expected format
      const result = {};
      for (const slot of slots) {
        const slotKey = `${slot.startTime}-${slot.endTime}`;
        const capacities = slotCapacities[slotKey] || [];
        result[slotKey] = Array.from(new Set(capacities)).sort((a, b) => a - b);
      }
      
      return new Response(JSON.stringify({
        success: true,
        slotCapacities: result
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    // Default: return available slots (backward compatibility)
    if (!body.venue || !body.bookingDate || !body.minCapacity) {
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
    
    // Fallback to original slots behavior
    const { venue, bookingDate, minCapacity, granularityMinutes = 60 } = body;
    
    // Generate time slots from 10:00 to 02:00 (next day)
    const timeSlots = [];
    for (let hour = 10; hour <= 23; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    timeSlots.push('00:00', '00:30', '01:00', '01:30', '02:00');
    
    // Check availability for each slot
    const slots = [];
    for (let i = 0; i < timeSlots.length - 1; i++) {
      const startTime = timeSlots[i];
      const endTime = timeSlots[i + 1];
      
      // Check if slot is available
      const { data: booths, error } = await supabase
        .from('karaoke_booths')
        .select('id, name, capacity, hourly_rate')
        .eq('venue', venue)
        .gte('capacity', minCapacity)
        .not('id', 'in', `(
          SELECT booth_id FROM karaoke_booth_holds 
          WHERE venue = '${venue}' 
          AND booking_date = '${bookingDate}' 
          AND start_time = '${startTime}' 
          AND end_time = '${endTime}' 
          AND status = 'active' 
          AND expires_at > NOW()
        )`)
        .not('id', 'in', `(
          SELECT booth_id FROM karaoke_bookings 
          WHERE venue = '${venue}' 
          AND booking_date = '${bookingDate}' 
          AND start_time = '${startTime}' 
          AND end_time = '${endTime}' 
          AND status != 'cancelled'
        )`);
      
      if (error) {
        console.error('Error checking slot availability:', error);
        continue;
      }
      
      const availableBooths = booths || [];
      const available = availableBooths.length > 0;
      const capacities = available ? Array.from(new Set(availableBooths.map(b => b.capacity))).sort((a, b) => a - b) : [];
      
      slots.push({
        startTime,
        endTime,
        available,
        capacities,
        boothCount: availableBooths.length
      });
    }
    
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
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});


