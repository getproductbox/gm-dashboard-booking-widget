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
  // Support action via header, query param, or body.action
  let action = req.headers.get('x-action') || url.searchParams.get('action') || '';
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    if (action === 'create') {
      const body = await req.json();
      if (!action && body?.action) action = body.action;
      
      if (!body.boothId || !body.bookingDate || !body.startTime || !body.endTime || !body.sessionId || !body.venue) {
        return new Response(JSON.stringify({
          error: 'Missing required fields'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Optional TTL
      const ttlMinutes = Math.max(1, Math.min(60, body.ttlMinutes ?? 10));
      const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      
      // Insert hold - conflicts will be rejected by trigger
      const { data: hold, error } = await supabase.from('karaoke_booth_holds').insert({
        booth_id: body.boothId,
        venue: body.venue,
        booking_date: body.bookingDate,
        start_time: body.startTime,
        end_time: body.endTime,
        session_id: body.sessionId,
        customer_email: body.customerEmail || null,
        status: 'active',
        expires_at: expiresAt
      }).select().single();
      
      if (error) {
        return new Response(JSON.stringify({
          error: error.message
        }), {
          status: 409,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Return in the format expected by the frontend
      return new Response(JSON.stringify({
        success: true,
        holdId: hold.id,           // Frontend expects holdId
        id: hold.id,               // Alternative for holdId
        expires_at: hold.expires_at, // Frontend expects expires_at
        hold: hold                 // Keep original structure for compatibility
      }), {
        status: 201,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (action === 'extend') {
      const body = await req.json();
      if (!action && body?.action) action = body.action;
      
      if (!body.holdId || !body.sessionId) {
        return new Response(JSON.stringify({
          error: 'holdId and sessionId are required'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const ttlMinutes = Math.max(1, Math.min(60, body.ttlMinutes ?? 10));
      const newExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
      
      // Only extender is same session and still active
      const { data: updated, error } = await supabase.from('karaoke_booth_holds').update({
        expires_at: newExpiresAt
      }).eq('id', body.holdId).eq('session_id', body.sessionId).eq('status', 'active').gt('expires_at', new Date().toISOString()).select().single();
      
      if (error || !updated) {
        return new Response(JSON.stringify({
          error: error?.message || 'Hold not extendable'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      // Return in the format expected by the frontend
      return new Response(JSON.stringify({
        success: true,
        holdId: updated.id,
        id: updated.id,
        expires_at: updated.expires_at,
        hold: updated
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    if (action === 'release') {
      const body = await req.json();
      if (!action && body?.action) action = body.action;
      
      if (!body.holdId || !body.sessionId) {
        return new Response(JSON.stringify({
          error: 'holdId and sessionId are required'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      const { data: updated, error } = await supabase.from('karaoke_booth_holds').update({
        status: 'released'
      }).eq('id', body.holdId).eq('session_id', body.sessionId).eq('status', 'active').select().single();
      
      if (error || !updated) {
        return new Response(JSON.stringify({
          error: error?.message || 'Hold not releasable'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      
      return new Response(JSON.stringify({
        success: true,
        holdId: updated.id,
        id: updated.id,
        expires_at: updated.expires_at,
        hold: updated
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    
    return new Response(JSON.stringify({
      error: 'Unknown action'
    }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('karaoke-holds error:', error);
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


