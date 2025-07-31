import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const API_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Define CORS headers inline
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey || apiKey !== API_KEY) {
      return new Response(JSON.stringify({
        error: 'Invalid API key'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const url = new URL(req.url);
    const date = url.searchParams.get('date');
    const venue = url.searchParams.get('venue');
    const venueArea = url.searchParams.get('venue_area');

    if (!date) {
      return new Response(JSON.stringify({
        error: 'Date parameter is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Get existing bookings for the date
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('start_time, end_time, venue, venue_area')
      .eq('date', date)
      .eq('venue', venue || 'manor');

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({
        error: 'Database error'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate time slots (30-minute intervals) from 9 AM to 11 PM
    const timeSlots = [];
    const startHour = 9; // 9:00 AM
    const endHour = 23; // 11:00 PM

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        // Calculate end time (30 minutes later)
        let endHour = hour;
        let endMinute = minute + 30;
        if (endMinute >= 60) {
          endHour += 1;
          endMinute = 0;
        }
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        // Check if this time slot conflicts with existing bookings
        const isBooked = existingBookings?.some((booking) => {
          const bookingStart = booking.start_time;
          const bookingEnd = booking.end_time;
          
          // Check if the venue area matches (if specified)
          if (venueArea && booking.venue_area !== venueArea) {
            return false;
          }

          // Check if the time slot overlaps with the booking
          return (startTime >= bookingStart && startTime < bookingEnd) ||
                 (endTime > bookingStart && endTime <= bookingEnd) ||
                 (startTime <= bookingStart && endTime >= bookingEnd);
        }) || false;

        timeSlots.push({
          start: startTime,
          end: endTime,
          available: !isBooked
        });
      }
    }

    return new Response(JSON.stringify({
      time_slots: timeSlots
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error:', error);
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