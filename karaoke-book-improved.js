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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const body = await req.json();
    console.log('karaoke-book request body:', JSON.stringify(body, null, 2));
    
    // Validate required fields
    if (!body.holdId || !body.sessionId || !body.customerName) {
      console.error('Missing required fields:', { holdId: !!body.holdId, sessionId: !!body.sessionId, customerName: !!body.customerName });
      return new Response(JSON.stringify({
        error: 'Missing required fields: holdId, sessionId, customerName'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Re-fetch hold and verify ownership/state
    const nowIso = new Date().toISOString();
    console.log('Fetching hold:', body.holdId, 'session:', body.sessionId);
    
    const { data: hold, error: holdErr } = await supabase
      .from('karaoke_booth_holds')
      .select('id, booth_id, venue, booking_date, start_time, end_time, status, expires_at')
      .eq('id', body.holdId)
      .eq('session_id', body.sessionId)
      .single();
    
    if (holdErr) {
      console.error('Hold fetch error:', holdErr);
      return new Response(JSON.stringify({
        error: 'Hold not found or database error',
        details: holdErr.message
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!hold) {
      console.error('Hold not found:', body.holdId);
      return new Response(JSON.stringify({
        error: 'Hold not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Hold found:', hold);
    
    if (hold.status !== 'active') {
      console.error('Hold not active:', hold.status);
      return new Response(JSON.stringify({
        error: 'Hold is not active',
        details: `Hold status: ${hold.status}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (hold.expires_at <= nowIso) {
      console.error('Hold expired:', hold.expires_at, 'now:', nowIso);
      return new Response(JSON.stringify({
        error: 'Hold has expired',
        details: `Expired at: ${hold.expires_at}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Fetch booth to calculate price/duration
    console.log('Fetching booth:', hold.booth_id);
    const { data: booth, error: boothErr } = await supabase
      .from('karaoke_booths')
      .select('id, hourly_rate')
      .eq('id', hold.booth_id)
      .single();
    
    if (boothErr || !booth) {
      console.error('Booth fetch error:', boothErr);
      return new Response(JSON.stringify({
        error: 'Booth not found',
        details: boothErr?.message
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Booth found:', booth);

    // Compute duration hours
    const toMinutes = (t) => {
      const [h, m] = t.slice(0, 5).split(':').map(Number);
      return h * 60 + m;
    };
    
    const durationMinutes = Math.max(0, toMinutes(hold.end_time) - toMinutes(hold.start_time));
    const durationHours = durationMinutes / 60;
    const totalAmount = Number(booth.hourly_rate) * durationHours;
    
    console.log('Calculated:', { durationMinutes, durationHours, totalAmount });

    // Check if there's already a booking for this booth/time
    console.log('Checking for existing bookings...');
    const { data: existingBookings, error: checkErr } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('karaoke_booth_id', hold.booth_id)
      .eq('booking_date', hold.booking_date)
      .eq('start_time', hold.start_time)
      .eq('end_time', hold.end_time)
      .neq('status', 'cancelled');
    
    if (checkErr) {
      console.error('Check existing bookings error:', checkErr);
      return new Response(JSON.stringify({
        error: 'Failed to check existing bookings',
        details: checkErr.message
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (existingBookings && existingBookings.length > 0) {
      console.error('Existing bookings found:', existingBookings);
      return new Response(JSON.stringify({
        error: 'Booth is already booked for this time slot',
        details: `Found ${existingBookings.length} existing booking(s)`
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create booking
    console.log('Creating booking...');
    const bookingData = {
      customer_name: body.customerName.trim(),
      customer_email: body.customerEmail?.trim() || null,
      customer_phone: body.customerPhone?.trim() || null,
      booking_type: 'karaoke_booking',
      venue: hold.venue,
      karaoke_booth_id: hold.booth_id,
      booking_date: hold.booking_date,
      start_time: hold.start_time,
      end_time: hold.end_time,
      duration_hours: durationHours,
      guest_count: body.guestCount || 1,
      total_amount: totalAmount,
      status: 'confirmed',
      payment_status: 'unpaid',
      created_by: null
    };
    
    console.log('Booking data:', bookingData);
    
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .insert(bookingData)
      .select()
      .single();
    
    if (bookingErr) {
      console.error('Booking creation error:', bookingErr);
      return new Response(JSON.stringify({
        error: 'Failed to create booking',
        details: bookingErr.message,
        code: bookingErr.code
      }), {
        status: 409,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (!booking) {
      console.error('No booking returned after insert');
      return new Response(JSON.stringify({
        error: 'Failed to create booking - no data returned'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    console.log('Booking created successfully:', booking.id);

    // Mark hold consumed
    console.log('Marking hold as consumed...');
    const { error: consumeErr } = await supabase
      .from('karaoke_booth_holds')
      .update({
        status: 'consumed',
        booking_id: booking.id
      })
      .eq('id', body.holdId)
      .eq('session_id', body.sessionId)
      .eq('status', 'active');
    
    if (consumeErr) {
      // NOTE: booking already created; this is a soft failure but we surface it
      console.error('Warning: booking created but failed to mark hold consumed:', consumeErr);
    } else {
      console.log('Hold marked as consumed successfully');
    }

    return new Response(JSON.stringify({
      success: true,
      bookingId: booking.id,
      message: 'Booking created successfully'
    }), {
      status: 201,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('karaoke-book error:', error);
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


