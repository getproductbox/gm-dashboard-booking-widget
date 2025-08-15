-- Database function to get available karaoke booths
-- This avoids the PGRST100 parsing issues with nested queries

CREATE OR REPLACE FUNCTION get_available_karaoke_booths(
  p_venue TEXT,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_min_capacity INTEGER
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  capacity INTEGER,
  hourly_rate NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.name,
    kb.capacity,
    kb.hourly_rate
  FROM karaoke_booths kb
  WHERE kb.venue = p_venue
    AND kb.capacity >= p_min_capacity
    AND kb.id NOT IN (
      SELECT booth_id 
      FROM karaoke_booth_holds 
      WHERE venue = p_venue 
        AND booking_date = p_booking_date 
        AND start_time = p_start_time 
        AND end_time = p_end_time 
        AND status = 'active' 
        AND expires_at > NOW()
    )
    AND kb.id NOT IN (
      SELECT booth_id 
      FROM karaoke_bookings 
      WHERE venue = p_venue 
        AND booking_date = p_booking_date 
        AND start_time = p_start_time 
        AND end_time = p_end_time 
        AND status != 'cancelled'
    );
END;
$$;

