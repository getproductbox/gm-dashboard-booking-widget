// GM Booking Widget - Standalone Version
(function() {
  'use strict';

  // Widget configuration
  window.GMBookingWidgetConfig = window.GMBookingWidgetConfig || {
    // Legacy/public booking API (venue hire / vip)
    apiEndpoint: 'https://plksvatjdylpuhjitbfc.supabase.co/functions/v1',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NDkzMywiZXhwIjoyMDY2MzQwOTMzfQ.M4Ikh3gSAVTPDxkMNrXLFxCPjHYqaBC5HcVavpHpNlk',
    // Supabase client for karaoke flow
    supabaseUrl: 'https://plksvatjdylpuhjitbfc.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NjQ5MzMsImV4cCI6MjA2NjM0MDkzM30.IdM8u1iq88C0ruwp7IkMB7PxwnfwmRyl6uLnBmZq5ys',
    theme: 'light',
    primaryColor: '#007bff',
    showSpecialRequests: true,
    debug: false
  };

  // Dynamic data storage
  let venueConfig = null;
  let pricingData = null;
  let karaokeBooths = [];

  // Cache for API responses
  const dataCache = {
    venueConfig: null,
    pricing: {},
    karaokeBooths: {},
    karaokeAvailability: {}, // key: venue|date|minCapacity|granularity -> { data, ts }
    karaokeBoothsBySlot: {}, // key: venue|date|start|end|minCapacity -> { data, ts }
    lastUpdated: null
  };

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // Format date for display
  function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format date for API (UTC-sensitive)
  function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
  }

  // Format date as local YYYY-MM-DD (no timezone conversion)
  function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Check if date is a Saturday
  function isSaturday(date) {
    return date.getDay() === 6;
  }

  // Get next Saturday
  function getNextSaturday() {
    const today = new Date();
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);
    return nextSaturday;
  }

  // API Integration Functions
  async function fetchVenueConfig(venueFilter = null) {
    try {
      const config = window.GMBookingWidgetConfig;
      let url = `${config.apiEndpoint}/venue-config-api`;
      if (venueFilter) {
        url += `?venue=${venueFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'x-api-key': config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle both single venue and multiple venues response
      let venues;
      if (venueFilter) {
        venues = data.venue ? [data.venue] : [];
      } else {
        venues = data.venues || [];
      }
      
      venueConfig = venues;
      dataCache.venueConfig = venues;
      dataCache.lastUpdated = Date.now();
      return venues;
    } catch (error) {
      console.error('Failed to fetch venue config:', error);
      console.error('API Error Details:', {
        url: `${window.GMBookingWidgetConfig.apiEndpoint}/venue-config-api`,
        error: error.message,
        stack: error.stack
      });
      // Return empty array to expose the API issue
      return [];
    }
  }

  // Note: fetchTimeSlots function removed - no longer needed for venue bookings
  // Time slots API is only used for karaoke booth bookings

  // Supabase client (loaded on demand for karaoke flow)
  let supabaseClient = null;

  async function ensureSupabaseClient(config) {
    if (supabaseClient) return supabaseClient;
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
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
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase client not available after loading script');
    }
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    return supabaseClient;
  }

  // Karaoke API wrappers
  async function fetchKaraokeVenueSlots(supabase, { venue, bookingDate, minCapacity, granularityMinutes = 60 }) {
    const cacheKey = `${venue}|${bookingDate}|${minCapacity}|${granularityMinutes}`;
    const cached = dataCache.karaokeAvailability[cacheKey];
    const now = Date.now();
    if (cached && (now - cached.ts) < 60 * 1000) { // 60s TTL
      return { data: cached.data, error: null };
    }
    const res = await supabase.functions.invoke('karaoke-availability', {
      body: { venue, bookingDate, minCapacity, granularityMinutes }
    });
    if (!res.error) {
      dataCache.karaokeAvailability[cacheKey] = { data: res.data, ts: now };
    }
    return res;
  }

  async function fetchKaraokeBoothsForSlot(supabase, { venue, bookingDate, startTime, endTime, minCapacity }) {
    const cacheKey = `${venue}|${bookingDate}|${startTime}|${endTime}|${minCapacity}`;
    const cached = dataCache.karaokeBoothsBySlot[cacheKey];
    const now = Date.now();
    if (cached && (now - cached.ts) < 60 * 1000) { // 60s TTL
      return { data: cached.data, error: null };
    }
    const res = await supabase.functions.invoke('karaoke-availability', {
      body: { action: 'boothsForSlot', venue, bookingDate, startTime, endTime, minCapacity }
    });
    if (!res.error) {
      dataCache.karaokeBoothsBySlot[cacheKey] = { data: res.data, ts: now };
    }
    return res;
  }

  async function karaokeCreateHold(supabase, { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes = 10 }) {
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'create' },
      body: { boothId, venue, bookingDate, startTime, endTime, sessionId, customerEmail, ttlMinutes }
    });
  }

  async function karaokeReleaseHold(supabase, { holdId, sessionId }) {
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'release' },
      body: { holdId, sessionId }
    });
  }

  async function karaokeExtendHold(supabase, { holdId, sessionId, ttlMinutes = 10 }) {
    return supabase.functions.invoke('karaoke-holds', {
      headers: { 'x-action': 'extend' },
      body: { holdId, sessionId, ttlMinutes }
    });
  }

  async function karaokeFinalizeBooking(supabase, { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }) {
    return supabase.functions.invoke('karaoke-book', {
      body: { holdId, sessionId, customerName, customerEmail, customerPhone, guestCount }
    });
  }

  async function fetchPricing(venue, venueArea, date, guests, duration = 4) {
    try {
      const config = window.GMBookingWidgetConfig;
      const url = `${config.apiEndpoint}/pricing-api`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          venue,
          venueArea,
          date,
          guests,
          duration
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      return null;
    }
  }

  async function fetchKaraokeBooths(venue, availableOnly = true) {
    try {
      const config = window.GMBookingWidgetConfig;
      let url = `${config.apiEndpoint}/karaoke-booths-api?venue=${venue}`;
      if (availableOnly) {
        url += '&available=true';
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.booths || [];
    } catch (error) {
      console.error('Failed to fetch karaoke booths:', error);
      return [];
    }
  }

  function isCacheValid() {
    return dataCache.lastUpdated && (Date.now() - dataCache.lastUpdated) < CACHE_DURATION;
  }

  async function initializeWidgetData() {
    if (!isCacheValid()) {
      const venues = await fetchVenueConfig();
      if (!venues || venues.length === 0) {
        console.error('❌ CRITICAL: No venue data available! Check venue-config-api endpoint.');
        console.error('🔧 API Endpoint:', `${window.GMBookingWidgetConfig.apiEndpoint}/venue-config-api`);
        console.error('🔑 API Key configured:', !!window.GMBookingWidgetConfig.apiKey);
        throw new Error('Failed to load venue configuration. Cannot initialize booking widget.');
      }
    }
  }

  function populateVenueAreas(venueId, container = document) {
    const venueAreaSelect = container.querySelector('select[name="venueArea"]');
    if (!venueAreaSelect) return;

    const selectedVenue = venueConfig.find(v => v.id === venueId);
    if (!selectedVenue) return;

    venueAreaSelect.innerHTML = '<option value="">Select area</option>';
    selectedVenue.areas.forEach(area => {
      const option = document.createElement('option');
      option.value = area.id;
      option.textContent = `${area.name} (${area.capacity} guests)`;
      venueAreaSelect.appendChild(option);
    });
  }

  function populateTimeOptions(container = document) {
    const startTimeSelect = container.querySelector('select[name="startTime"]');
    const endTimeSelect = container.querySelector('select[name="endTime"]');
    
    if (!startTimeSelect || !endTimeSelect) return;

    // Generate time slots from 10:00 to 02:00 (next day)
    const timeSlots = [];
    for (let hour = 10; hour <= 23; hour++) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    timeSlots.push('00:00', '00:30', '01:00', '01:30', '02:00');

    // Populate start time options
    startTimeSelect.innerHTML = '<option value="">Select start time</option>';
    timeSlots.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      startTimeSelect.appendChild(option);
    });

    // Populate end time options
    endTimeSelect.innerHTML = '<option value="">Select end time</option>';
    timeSlots.forEach(time => {
      const option = document.createElement('option');
      option.value = time;
      option.textContent = time;
      endTimeSelect.appendChild(option);
    });
  }

  async function updatePricingDisplay(venue, venueArea, date, guests, duration = 4, container = document) {
    const pricingContainer = container.querySelector('.pricing-display');
    if (!pricingContainer) return;

    const pricing = await fetchPricing(venue, venueArea, date, guests, duration);
    if (!pricing) {
      pricingContainer.style.display = 'none';
      return;
    }

    pricingContainer.style.display = 'block';
    pricingContainer.innerHTML = `
      <div class="pricing-info">
        <h4>Pricing Estimate</h4>
        <div class="price-breakdown">
          <div class="price-item">
            <span>Venue Hire (${duration} hours)</span>
            <span>£${pricing.basePrice}</span>
          </div>
          ${pricing.additionalFees ? pricing.additionalFees.map(fee => `
            <div class="price-item">
              <span>${fee.name}</span>
              <span>£${fee.amount}</span>
            </div>
          `).join('') : ''}
          <div class="price-item total">
            <span>Total</span>
            <span>£${pricing.totalPrice}</span>
          </div>
        </div>
        <div class="includes">
          <h5>Includes:</h5>
          <ul>
            <li>Venue access for ${duration} hours</li>
            <li>Basic setup and cleanup</li>
            <li>Security deposit (refundable)</li>
          </ul>
        </div>
      </div>
    `;
  }

  // -----------------------------
  // Karaoke Flow (UI + State)
  // -----------------------------

  function getKaraokeState(container) {
    if (!container.__karaokeState) {
      container.__karaokeState = {
        sessionId: localStorage.getItem('karaoke_session_id') || null,
        selectedSlot: null, // { startTime, endTime }
        minCapacity: null,
        holdId: null,
        holdExpiresAt: null,
        countdownIntervalId: null,
        didAutoExtend: false
      };
      if (!container.__karaokeState.sessionId) {
        container.__karaokeState.sessionId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
        localStorage.setItem('karaoke_session_id', container.__karaokeState.sessionId);
      }
    }
    return container.__karaokeState;
  }

  function setKaraokeState(container, updates) {
    const state = getKaraokeState(container);
    Object.assign(state, updates);
    return state;
  }

  function renderKaraokeSlots(container, slots) {
    const grid = container.querySelector('.karaoke-slots');
    const empty = container.querySelector('.karaoke-empty');
    const loading = container.querySelector('.karaoke-slots-loading');
    if (!grid) return;
    grid.innerHTML = '';
    if (loading) loading.style.display = 'none';

    const availableSlots = (slots || []).filter(s => s.available);
    if (availableSlots.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    const state = getKaraokeState(container);
    availableSlots.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'karaoke-slot-btn';
      const chips = Array.isArray(slot.capacities) && slot.capacities.length
        ? `<div class=\"cap-chips\">${slot.capacities.map(c => `<span class=\"cap-chip\">${c}</span>`).join('')}</div>`
        : '';
      btn.innerHTML = `<div class=\"slot-line\">${slot.startTime} – ${slot.endTime}</div>${chips}`;
      btn.dataset.startTime = slot.startTime;
      btn.dataset.endTime = slot.endTime;
      if (state.selectedSlot && state.selectedSlot.startTime === slot.startTime && state.selectedSlot.endTime === slot.endTime) {
        btn.classList.add('selected');
      }
      grid.appendChild(btn);
    });
  }

  async function hydrateSlotCapacities(container, config) {
    const venue = (container.querySelector('select[name="venue"]')?.value) || config.venue;
    const bookingDate = container.querySelector('input[name="bookingDate"]').value;
    const guestCountStr = container.querySelector('input[name="guestCount"]').value;
    const minCapacity = Math.max(1, parseInt(guestCountStr || '0', 10));
    if (!venue || !bookingDate || !minCapacity) return;

    const supabase = await ensureSupabaseClient(config);
    const buttons = Array.from(container.querySelectorAll('.karaoke-slot-btn'));
    let index = 0;
    const concurrency = 4;
    async function worker() {
      while (index < buttons.length) {
        const current = buttons[index++];
        if (!current || current.querySelector('.cap-chips')) continue;
        const startTime = current.dataset.startTime;
        const endTime = current.dataset.endTime;
        try {
          const { data } = await fetchKaraokeBoothsForSlot(supabase, { venue, bookingDate, startTime, endTime, minCapacity });
          const capacities = Array.from(new Set((data?.availableBooths || []).map(b => b.capacity))).sort((a,b) => a - b);
          if (capacities.length && !current.querySelector('.cap-chips')) {
            current.insertAdjacentHTML('beforeend', `<div class="cap-chips">${capacities.map(c => `<span class=\"cap-chip\">${c}</span>`).join('')}</div>`);
          }
        } catch (_) { /* ignore per-slot errors */ }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, buttons.length) }, () => worker()));
  }

  function clearKaraokeUI(container) {
    const boothsWrap = container.querySelector('.karaoke-booths');
    const boothsSelect = container.querySelector('select[name="boothId"]');
    const holdWrap = container.querySelector('.karaoke-hold');
    const holdInput = container.querySelector('input[name="holdId"]');
    const sessionInput = container.querySelector('input[name="sessionId"]');
    if (boothsSelect) {
      boothsSelect.innerHTML = '<option value="">Select a booth</option>';
    }
    if (boothsWrap) boothsWrap.style.display = 'none';
    if (holdWrap) holdWrap.style.display = 'none';
    if (holdInput) holdInput.value = '';
    if (sessionInput) sessionInput.value = '';
  }

  function startHoldCountdown(container, config) {
    const state = getKaraokeState(container);
    const holdWrap = container.querySelector('.karaoke-hold');
    const countdown = container.querySelector('.hold-countdown');
    if (!holdWrap || !countdown || !state.holdExpiresAt) return;
    holdWrap.style.display = 'block';

    if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
    state.didAutoExtend = false;

    function update() {
      const now = Date.now();
      const distance = new Date(state.holdExpiresAt).getTime() - now;
      if (distance <= 0) {
        clearInterval(state.countdownIntervalId);
        countdown.textContent = '00:00';
        return;
      }
      const minutes = Math.floor(distance / 60000);
      const seconds = Math.floor((distance % 60000) / 1000);
      countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Auto-extend once at T-60s
      if (!state.didAutoExtend && distance <= 60000 && state.holdId) {
        state.didAutoExtend = true;
        ensureSupabaseClient(config).then(supabase => karaokeExtendHold(supabase, {
          holdId: state.holdId,
          sessionId: state.sessionId,
          ttlMinutes: 10
        })).catch(() => {/* ignore errors on auto-extend */});
      }
    }
    update();
    state.countdownIntervalId = setInterval(update, 1000);
  }

  async function karaokeRefreshAvailability(container, config) {
    try {
      const loading = container.querySelector('.karaoke-slots-loading');
      const slotsGroup = container.querySelector('.karaoke-slots-group');
      const dateVal = container.querySelector('input[name="bookingDate"]').value;
      if (!dateVal) {
        // No date selected → ensure slots UI is hidden and do not fetch
        if (slotsGroup) slotsGroup.style.display = 'none';
        return;
      }
      if (slotsGroup) slotsGroup.style.display = 'block';
      if (loading) loading.style.display = 'flex';
      const venue = (container.querySelector('select[name="venue"]')?.value) || config.venue;
      const bookingDate = container.querySelector('input[name="bookingDate"]').value; // already YYYY-MM-DD
      const guestCountStr = container.querySelector('input[name="guestCount"]').value;
      const minCapacity = Math.max(1, parseInt(guestCountStr || '0', 10));
      const supabase = await ensureSupabaseClient(config);
      const { data, error } = await fetchKaraokeVenueSlots(supabase, {
        venue,
        bookingDate,
        minCapacity,
        granularityMinutes: 60
      });
      if (error) throw error;
      const slots = data?.slots || [];
      renderKaraokeSlots(container, slots);
      // If capacities are not provided by API, hydrate from per-slot booth results in background
      const hasCaps = Array.isArray(slots) && slots.some(s => Array.isArray(s.capacities) && s.capacities.length);
      if (!hasCaps) {
        // Fire and forget; do not block UI
        hydrateSlotCapacities(container, config);
      }
    } catch (err) {
      showStatus(container, `❌ Failed to load availability. Please retry.`, 'error');
    }
  }

  async function clearKaraokeState(container, config, opts = { releaseHold: false, clearSession: false }) {
    const state = getKaraokeState(container);
    if (state.countdownIntervalId) {
      clearInterval(state.countdownIntervalId);
      state.countdownIntervalId = null;
    }
    if (opts.releaseHold && state.holdId) {
      try {
        const supabase = await ensureSupabaseClient(config);
        await karaokeReleaseHold(supabase, { holdId: state.holdId, sessionId: state.sessionId });
      } catch (_) { /* no-op */ }
    }
    setKaraokeState(container, {
      selectedSlot: null,
      holdId: null,
      holdExpiresAt: null,
      didAutoExtend: false
    });
    if (opts.clearSession) {
      try { localStorage.removeItem('karaoke_session_id'); } catch (_) {}
    }
    clearKaraokeUI(container);
  }

  function setupKaraokeHandlers(container, config) {
    const venueSelect = container.querySelector('select[name="venue"]');
    const dateInput = container.querySelector('input[name="bookingDate"]');
    const guestInput = container.querySelector('input[name="guestCount"]');
    const slotsGrid = container.querySelector('.karaoke-slots');
    const boothsWrap = container.querySelector('.karaoke-booths');
    const boothsSelect = container.querySelector('select[name="boothId"]');
    const holdWrap = container.querySelector('.karaoke-hold');
    const holdCancelBtn = container.querySelector('.hold-cancel');

    async function loadSlots() {
      await clearKaraokeState(container, config, { releaseHold: true, clearSession: false });
      await karaokeRefreshAvailability(container, config);
    }

    // Trigger availability on input changes
    [venueSelect, dateInput, guestInput].forEach(el => {
      if (!el) return;
      el.addEventListener('change', loadSlots);
      if (el === guestInput) {
        el.addEventListener('input', () => {
          // Debounce-ish: small timeout
          clearTimeout(el.__debounce);
          el.__debounce = setTimeout(loadSlots, 300);
        });
      }
    });

    // Initial load if fields pre-filled
    if ((venueSelect?.value || config.venue) && dateInput?.value && guestInput?.value) {
      loadSlots();
    } else {
      const group = container.querySelector('.karaoke-slots-group');
      if (group) group.style.display = 'none';
    }

    // Slot click → fetch booths
    if (slotsGrid) {
      slotsGrid.addEventListener('click', async (e) => {
        const target = e.target.closest('.karaoke-slot-btn');
        if (!target) return;
        const startTime = target.dataset.startTime;
        const endTime = target.dataset.endTime;
        const venue = (venueSelect?.value) || config.venue;
        const bookingDate = dateInput.value;
        const minCapacity = Math.max(1, parseInt(guestInput.value || '0', 10));

        // Immediate visual selection feedback
        const buttons = container.querySelectorAll('.karaoke-slot-btn');
        buttons.forEach(b => b.classList.remove('selected'));
        target.classList.add('selected');

        // Release old hold and clear UI (does not affect slot selection visuals)
        await clearKaraokeState(container, config, { releaseHold: true, clearSession: false });
        setKaraokeState(container, { selectedSlot: { startTime, endTime }, minCapacity });
        // Clear any previous status message when changing slot
        showStatus(container, '', '');

        // Show booths area with loading state immediately
        const boothsLoading = container.querySelector('.karaoke-booths-loading');
        boothsWrap.style.display = 'block';
        if (boothsLoading) boothsLoading.style.display = 'flex';
        if (boothsSelect) boothsSelect.disabled = true;

        try {
          const supabase = await ensureSupabaseClient(config);
          const { data, error } = await fetchKaraokeBoothsForSlot(supabase, {
            venue, bookingDate, startTime, endTime, minCapacity
          });
          if (error) throw error;
          const booths = data?.availableBooths || [];
          boothsSelect.innerHTML = '<option value="">Select a booth</option>' + booths.map(b => {
            const currency = '£';
            const rate = (typeof b.hourly_rate === 'number') ? `${currency}${b.hourly_rate.toFixed(2)}` : `${currency}${b.hourly_rate}`;
            return `<option value="${b.id}">${b.name} — cap ${b.capacity} (${rate}/hour)</option>`;
          }).join('');
          if (boothsLoading) boothsLoading.style.display = 'none';
          if (boothsSelect) boothsSelect.disabled = false;
        } catch (err) {
          if (boothsLoading) boothsLoading.style.display = 'none';
          if (boothsSelect) boothsSelect.disabled = false;
          showStatus(container, '❌ Failed to load booths. Please try another slot.', 'error');
        }
      });
    }

    // Booth selection → create hold
    if (boothsSelect) {
      boothsSelect.addEventListener('change', async (e) => {
        const boothId = e.target.value;
        const state = getKaraokeState(container);
        if (!boothId || !state?.selectedSlot) return;

        try {
          const supabase = await ensureSupabaseClient(config);
          const venue = (venueSelect?.value) || config.venue;
          const bookingDate = dateInput.value;
          const { startTime, endTime } = state.selectedSlot;
          const { data, error } = await karaokeCreateHold(supabase, {
            boothId,
            venue,
            bookingDate,
            startTime,
            endTime,
            sessionId: state.sessionId,
            customerEmail: (container.querySelector('input[name="customerEmail"]').value) || undefined,
            ttlMinutes: 10
          });
          if (error) {
            const status = error?.status || error?.code;
            if (status === 409 || status === 400) {
              showStatus(container, '❌ That slot just got taken. Please pick another time.', 'error');
              await karaokeRefreshAvailability(container, config);
            } else {
              showStatus(container, '❌ Could not create hold. Please try a different slot.', 'error');
            }
            return;
          }
          // Expect data to include holdId and expires_at
          const holdId = data?.holdId || data?.id;
          const expiresAt = data?.expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString();
          setKaraokeState(container, { holdId, holdExpiresAt: expiresAt });
          startHoldCountdown(container, config);
          // Mirror state to hidden inputs as a safety net for submission
          const form = container.querySelector('#gm-booking-form');
          if (form) {
            let holdInput = form.querySelector('input[name="holdId"]');
            if (!holdInput) {
              holdInput = document.createElement('input');
              holdInput.type = 'hidden';
              holdInput.name = 'holdId';
              form.appendChild(holdInput);
            }
            holdInput.value = String(holdId || '');
            let sessionInput = form.querySelector('input[name="sessionId"]');
            if (!sessionInput) {
              sessionInput = document.createElement('input');
              sessionInput.type = 'hidden';
              sessionInput.name = 'sessionId';
              form.appendChild(sessionInput);
            }
            const stateNow = getKaraokeState(container);
            sessionInput.value = String(stateNow.sessionId || '');
          }
          // Clear any previous error now that hold is active
          showStatus(container, '', '');
        } catch (err) {
          showStatus(container, `❌ Network error: ${err.message}`, 'error');
        }
      });
    }

    // Hold cancel
    if (holdCancelBtn) {
      holdCancelBtn.addEventListener('click', async () => {
        await clearKaraokeState(container, config, { releaseHold: true, clearSession: false });
        // Re-enable slot selection
        const buttons = container.querySelectorAll('.karaoke-slot-btn');
        buttons.forEach(b => { b.disabled = false; b.classList.remove('selected'); });
      });
    }
  }

  /**
   * Creates the modal overlay structure without form content
   * 
   * IMPORTANT: This creates a clean modal structure where form content
   * is inserted directly into .gm-booking-modal-content after the header.
   * This ensures CSS selectors like ".gm-booking-modal-content .form-row" work correctly.
   * 
   * @param {Object} config - Widget configuration
   * @returns {HTMLElement} - The modal element
   */
  function createModalOverlay(config) {
    // Remove existing modal if present
    const existingModal = document.getElementById('gm-booking-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Generate specific modal title based on venue and booking type
    let modalTitle = 'Book Your Experience';
    
    if (config.bookingType === 'vip_tickets') {
      if (config.venue === 'manor') {
        modalTitle = 'Book Manor VIP Tickets';
      } else if (config.venue === 'hippie') {
        modalTitle = 'Book Hippie VIP Tickets';
      } else {
        modalTitle = 'Book VIP Tickets';
      }
    } else {
      // Venue hire booking
      if (config.venue === 'manor') {
        modalTitle = 'Book Manor Venue';
      } else if (config.venue === 'hippie') {
        modalTitle = 'Book Hippie Venue';
      } else {
        modalTitle = 'Book Your Venue';
      }
    }

    const modalHTML = `
      <div id="gm-booking-modal" class="gm-booking-modal-overlay">
        <div class="gm-booking-modal-content">
          <div class="gm-booking-modal-header">
            <h2 class="gm-booking-modal-title">${modalTitle}</h2>
            <button class="gm-booking-modal-close" onclick="closeBookingModal()">&times;</button>
          </div>
          <!-- Form content will be inserted directly here -->
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add backdrop click handler
    const modal = document.getElementById('gm-booking-modal');
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeBookingModal();
      }
    });

    return document.getElementById('gm-booking-modal');
  }

  /**
   * Creates form HTML for modal insertion (SIMPLIFIED)
   * 
   * @param {Object} config - Widget configuration
   * @returns {string} - Form HTML string
   */
  function createModalFormHTML(config) {
    const isVIPBooking = config.bookingType === 'vip_tickets';
    const availableVenues = (venueConfig || []).filter(v => 
      !config.venue || config.venue === 'both' || v.id === config.venue
    );

    return `
      <form id="gm-booking-form" class="gm-booking-modal-form">
        ${generateCustomerFields()}
        ${generateBookingFields(config, availableVenues, isVIPBooking)}
        ${config.showSpecialRequests ? generateSpecialRequestsField(isVIPBooking) : ''}
        ${generateSubmitButton(isVIPBooking)}
        <div id="widget-status" class="status-container"></div>
      </form>
    `;
  }

  // Helper functions to reduce duplication
  function generateCustomerFields() {
    return `
      <div class="form-group">
        <label class="form-label">Customer Name *</label>
        <input type="text" name="customerName" class="form-input" placeholder="Enter your name" required>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" name="customerEmail" class="form-input" placeholder="your@email.com">
        </div>
        <div class="form-group">
          <label class="form-label">Phone</label>
          <input type="tel" name="customerPhone" class="form-input" placeholder="+44 123 456 7890">
        </div>
      </div>
    `;
  }

  function generateBookingFields(config, availableVenues, isVIPBooking) {
    const isKaraoke = config.bookingType === 'karaoke';
    if (isKaraoke) {
      return `
        ${!config.venue || config.venue === 'both' ? `
          <div class="form-group">
            <label class="form-label">Venue *</label>
            <select name="venue" class="form-select" required>
              <option value="">Select venue</option>
              <option value="manor">Manor</option>
              <option value="hippie">Hippie</option>
            </select>
          </div>
        ` : ''}

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Booking Date *</label>
            <input type="date" name="bookingDate" class="form-input" placeholder="Select Date" required>
          </div>
          <div class="form-group">
            <label class="form-label">Guests *</label>
            <input type="number" name="guestCount" class="form-input" min="1" max="100" placeholder="e.g. 4" required>
          </div>
        </div>

        <div class="form-group karaoke-slots-group" style="display:none;">
          <label class="form-label">Select a Time Slot</label>
          <div class="karaoke-slots" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;"></div>
          <div class="karaoke-slots-loading" style="display:none; align-items:center; gap:8px; color:#6b7280; font-size:14px; margin-top:6px;">
            <span class="gm-spinner" aria-hidden="true"></span>
            <span>Loading slots...</span>
          </div>
          <div class="karaoke-empty" style="display:none; color:#6b7280; font-size:14px; margin-top:8px;">No slots available for your party size on this date.</div>
        </div>

        <div class="form-group karaoke-booths" style="display:none;">
          <label class="form-label">Booth</label>
          <select name="boothId" class="form-select">
            <option value="">Select a booth</option>
          </select>
          <div class="karaoke-booths-loading" style="display:none; align-items:center; gap:8px; color:#6b7280; font-size:14px; margin-top:6px;">
            <span class="gm-spinner" aria-hidden="true"></span>
            <span>Loading booths...</span>
          </div>
        </div>

        <div class="form-group karaoke-hold" style="display:none; color:#111827;">
          <div class="hold-status" style="display:flex; align-items:center; justify-content:space-between;">
            <span class="hold-text">Hold active. Expires in <span class="hold-countdown">10:00</span>.</span>
            <button type="button" class="hold-cancel" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">Cancel</button>
          </div>
        </div>
      `;
    }
    if (isVIPBooking) {
      return `
        ${!config.venue || config.venue === 'both' ? `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Venue *</label>
              <select name="venue" class="form-select" required>
                <option value="">Select venue</option>
                ${availableVenues.map(venue => `<option value="${venue.id}">${venue.name}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Booking Date *</label>
              <input type="date" name="bookingDate" class="form-input vip-date-picker" required>
            </div>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Booking Date *</label>
            <input type="date" name="bookingDate" class="form-input vip-date-picker" required>
          </div>
        `}
        
        <small style="color: #666; margin-bottom: 24px; display: block;">VIP tickets are only available on Saturdays</small>
        
        <div class="form-group">
          <label class="form-label">Number of Tickets *</label>
          <input type="number" name="ticketQuantity" class="form-input" min="1" max="100" placeholder="e.g. 4" required>
        </div>
      `;
    }

    // Venue hire fields
    return `
      ${!config.venue || config.venue === 'both' ? `
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Venue *</label>
            <select name="venue" class="form-select" required>
              <option value="">Select venue</option>
              ${availableVenues.map(venue => `<option value="${venue.id}">${venue.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Venue Area *</label>
            <select name="venueArea" class="form-select" required>
              <option value="">Select area</option>
            </select>
          </div>
        </div>
      ` : `
        <div class="form-group">
          <label class="form-label">Venue Area *</label>
          <select name="venueArea" class="form-select" required>
            <option value="">Select area</option>
          </select>
        </div>
      `}
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Booking Date *</label>
          <input type="date" name="bookingDate" class="form-input" required>
        </div>
        <div class="form-group">
          <label class="form-label">Number of Guests *</label>
          <input type="number" name="guestCount" class="form-input" min="1" max="500" placeholder="e.g. 8" required>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Start Time</label>
          <select name="startTime" class="form-select">
            <option value="">Select time</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">End Time</label>
          <select name="endTime" class="form-select">
            <option value="">Select time</option>
          </select>
        </div>
      </div>
    `;
  }

  function generateSpecialRequestsField(isVIPBooking) {
    const placeholder = isVIPBooking ? "VIP table request, dietary requirements..." : "Any special requirements...";
    return `
      <div class="form-group">
        <label class="form-label">Special Requests</label>
        <textarea name="specialRequests" class="form-textarea" placeholder="${placeholder}" rows="3"></textarea>
      </div>
    `;
  }

  function generateSubmitButton(isVIPBooking) {
    const buttonClass = isVIPBooking ? "submit-button vip-style" : "submit-button";
    const buttonText = isVIPBooking ? "Book VIP Tickets" : "Create Booking";
    
    return `
      <button type="submit" class="${buttonClass}">
        <span class="button-text">${buttonText}</span>
        <span class="loading-spinner" style="display: none;">⏳</span>
      </button>
    `;
  }

  function createWidgetHTML(config) {
    const themeClass = config.theme === 'dark' ? 'dark' : '';
    const isVIPBooking = config.bookingType === 'vip_tickets';
    const isKaraoke = config.bookingType === 'karaoke';
    
    // Get available venues from dynamic data
    let availableVenues = venueConfig || [];
    
    if (config.venue !== 'both' && config.venue) {
      availableVenues = availableVenues.filter(v => v.id === config.venue);
    }

    // Karaoke Booking form fields
    if (isKaraoke) {
      return `
        <div class="gm-booking-widget ${themeClass}">
          <div class="widget-card">
            <div class="widget-header">
              <h3 class="widget-title">Karaoke Booking</h3>
            </div>
            <form id="gm-booking-form" class="widget-form">
              <div class="form-group">
                <label class="form-label">Customer Name *</label>
                <input type="text" name="customerName" class="form-input" placeholder="Enter your name" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" name="customerEmail" class="form-input" placeholder="your@email.com">
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" name="customerPhone" class="form-input" placeholder="+44 123 456 7890">
                </div>
              </div>
              ${generateBookingFields(config, availableVenues, false)}
              ${config.showSpecialRequests ? `
                <div class="form-group">
                  <label class="form-label">Special Requests</label>
                  <textarea name="specialRequests" class="form-textarea" placeholder="Any special requirements..." rows="3"></textarea>
                </div>
              ` : ''}
              <button type="submit" class="submit-button">
                <span class="button-text">Confirm Booking</span>
                <span class="loading-spinner" style="display: none;">⏳</span>
              </button>
              <div id="widget-status" class="status-container"></div>
            </form>
          </div>
        </div>
      `;
    }

    // VIP Tickets form fields
    if (isVIPBooking) {
      return `
        <div class="gm-booking-widget ${themeClass}">
          <div class="widget-card">
            <div class="widget-header">
              <h3 class="widget-title">Book VIP Tickets</h3>
              <p style="color: #666; margin-top: 8px; font-size: 14px;">VIP tickets available on Saturdays only</p>
            </div>
            
            <form id="gm-booking-form" class="widget-form">
              <!-- Customer Information -->
              <div class="form-group">
                <label class="form-label">Customer Name *</label>
                <input type="text" name="customerName" class="form-input" placeholder="Enter your name" required>
              </div>
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Email</label>
                  <input type="email" name="customerEmail" class="form-input" placeholder="your@email.com">
                </div>
                
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" name="customerPhone" class="form-input" placeholder="+44 123 456 7890">
                </div>
              </div>
              
              <!-- Venue Selection (if not pre-configured) -->
              ${!config.venue || config.venue === 'both' ? `
                <div class="form-group">
                  <label class="form-label">Venue *</label>
                  <select name="venue" class="form-select" required>
                    <option value="">Select venue</option>
                    ${availableVenues.map(venue => 
                      `<option value="${venue.id}">${venue.name}</option>`
                    ).join('')}
                  </select>
                </div>
              ` : ''}
              
              <!-- Date Picker for VIP Tickets (Saturdays only) -->
              <div class="form-group">
                <label class="form-label">Booking Date *</label>
                <input type="date" name="bookingDate" class="form-input vip-date-picker" required>
                <small style="color: #666; margin-top: 4px; display: block;">VIP tickets are only available on Saturdays</small>
              </div>
              
              <!-- Ticket Quantity -->
              <div class="form-group">
                <label class="form-label">Number of Tickets *</label>
                <input type="number" name="ticketQuantity" class="form-input" min="1" max="100" placeholder="e.g. 4" required>
              </div>
              
              <!-- Special Requests -->
              ${config.showSpecialRequests ? `
                <div class="form-group">
                  <label class="form-label">Special Requests</label>
                  <textarea name="specialRequests" class="form-textarea" placeholder="VIP table request, dietary requirements..." rows="3"></textarea>
                </div>
              ` : ''}
              
              <!-- Submit Button -->
              <button type="submit" class="submit-button">
                <span class="button-text">Book VIP Tickets</span>
                <span class="loading-spinner" style="display: none;">⏳</span>
              </button>
            </form>
            
            <!-- Status Messages -->
            <div id="widget-status" class="status-container"></div>
          </div>
        </div>
      `;
    }

    // Venue Hire form fields
    return `
      <div class="gm-booking-widget ${themeClass}">
        <div class="widget-card">
          <div class="widget-header">
            <h3 class="widget-title">Book Your Venue</h3>
          </div>
          
          <form id="gm-booking-form" class="widget-form">
            <!-- Customer Information -->
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" name="customerName" class="form-input" placeholder="Enter your name" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" name="customerEmail" class="form-input" placeholder="your@email.com">
              </div>
              
              <div class="form-group">
                <label class="form-label">Phone</label>
                <input type="tel" name="customerPhone" class="form-input" placeholder="+44 123 456 7890">
              </div>
            </div>
            
            <!-- Venue Selection (if not pre-configured) -->
            ${!config.venue || config.venue === 'both' ? `
              <div class="form-group">
                <label class="form-label">Venue *</label>
                <select name="venue" class="form-select" required>
                  <option value="">Select venue</option>
                  ${availableVenues.map(venue => 
                    `<option value="${venue.id}">${venue.name}</option>`
                  ).join('')}
                </select>
              </div>
            ` : ''}
            
            <!-- Venue Area Selection -->
            <div class="form-group">
              <label class="form-label">Venue Area *</label>
              <select name="venueArea" class="form-select" required>
                <option value="">Select area</option>
                <!-- Venue areas will be populated dynamically based on selected venue -->
              </select>
            </div>
            
            <!-- Date and Time -->
            <div class="form-group">
              <label class="form-label">Booking Date *</label>
              <input type="date" name="bookingDate" class="form-input" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Time</label>
                <select name="startTime" class="form-select">
                  <option value="">Select time</option>
                  <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">End Time</label>
                <select name="endTime" class="form-select">
                  <option value="">Select time</option>
                  <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
                </select>
              </div>
            </div>
            
            <!-- Guest Count -->
            <div class="form-group">
              <label class="form-label">Number of Guests *</label>
              <input type="number" name="guestCount" class="form-input" min="1" max="500" placeholder="e.g. 8" required>
            </div>
            
            <!-- Special Requests -->
            ${config.showSpecialRequests ? `
              <div class="form-group">
                <label class="form-label">Special Requests</label>
                <textarea name="specialRequests" class="form-textarea" placeholder="Any special requirements..." rows="3"></textarea>
              </div>
            ` : ''}
            
            <!-- Submit Button -->
            <button type="submit" class="submit-button">
              <span class="button-text">Create Booking</span>
              <span class="loading-spinner" style="display: none;">⏳</span>
            </button>
          </form>
          
          <!-- Status Messages -->
          <div id="widget-status" class="status-container"></div>
        </div>
      </div>
    `;
  }

  // Validate form data
  function validateForm(formData, bookingType = 'venue_hire') {
    const errors = {};

    if (!formData.customerName || formData.customerName.trim().length === 0) {
      errors.customerName = 'Customer name is required';
    }

    if (!formData.customerEmail && !formData.customerPhone) {
      errors.customerEmail = 'Either email or phone number is required';
    }

    if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Please provide a valid email address';
    }

    if (bookingType === 'vip_tickets') {
      // VIP Tickets validation
      if (!formData.venue) {
        errors.venue = 'Please select a venue';
      }

      if (!formData.bookingDate) {
        errors.bookingDate = 'Please select a booking date';
      } else {
        const bookingDate = new Date(formData.bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate < today) {
          errors.bookingDate = 'Booking date cannot be in the past';
        } else if (!isSaturday(bookingDate)) {
          errors.bookingDate = 'VIP tickets are only available on Saturdays';
        }
      }

      if (!formData.ticketQuantity || formData.ticketQuantity < 1 || formData.ticketQuantity > 100) {
        errors.ticketQuantity = 'Ticket quantity must be between 1 and 100';
      }
    } else if (bookingType === 'karaoke') {
      // Karaoke validation (slot-based; no start/end manual times)
      if (!formData.venue) {
        errors.venue = 'Please select a venue';
      }
      if (!formData.bookingDate) {
        errors.bookingDate = 'Please select a booking date';
      } else {
        const bookingDate = new Date(formData.bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (bookingDate < today) {
          errors.bookingDate = 'Booking date cannot be in the past';
        }
      }
      if (!formData.guestCount || formData.guestCount < 1) {
        errors.guestCount = 'Guest count must be at least 1';
      }
    } else {
      // Venue Hire validation
      if (!formData.venue) {
        errors.venue = 'Please select a venue';
      }

      if (!formData.venueArea) {
        errors.venueArea = 'Please select a venue area';
      }

      if (!formData.bookingDate) {
        errors.bookingDate = 'Please select a booking date';
      } else {
        const bookingDate = new Date(formData.bookingDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (bookingDate < today) {
          errors.bookingDate = 'Booking date cannot be in the past';
        }
      }

      if (!formData.guestCount || formData.guestCount < 1) {
        errors.guestCount = 'Guest count must be at least 1';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Show status message
  function showStatus(container, message, type) {
    const statusDiv = container.querySelector('#widget-status');
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
  }

  // Handle form submission
  async function handleSubmit(event, container, config) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const isVIPBooking = config.bookingType === 'vip_tickets';
    const isKaraoke = config.bookingType === 'karaoke';
    
    const bookingData = {
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail') || undefined,
      customerPhone: formData.get('customerPhone') || undefined,
      bookingType: isVIPBooking ? 'vip_tickets' : (isKaraoke ? 'karaoke' : 'venue_hire'),
      venue: formData.get('venue') || config.venue,
      bookingDate: formData.get('bookingDate'),
      specialRequests: formData.get('specialRequests') || undefined,
    };

    if (isVIPBooking) {
      bookingData.ticketQuantity = parseInt(formData.get('ticketQuantity'));
    } else if (isKaraoke) {
      bookingData.guestCount = parseInt(formData.get('guestCount'));
    } else {
      bookingData.venueArea = formData.get('venueArea');
      bookingData.startTime = formData.get('startTime') || undefined;
      bookingData.endTime = formData.get('endTime') || undefined;
      bookingData.guestCount = parseInt(formData.get('guestCount'));
    }

    // Remove undefined values
    Object.keys(bookingData).forEach(key => {
      if (bookingData[key] === undefined) {
        delete bookingData[key];
      }
    });

    // Validate form
    const validation = validateForm(bookingData, config.bookingType);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      showStatus(container, `❌ ${errorMessage}`, 'error');
      return;
    }

    // Karaoke submit shortcut: require active hold and finalize via Edge Function
    if (isKaraoke) {
      try {
        const state = getKaraokeState(container);
        // Fallback: also check hidden inputs in case state got detached due to container scoping
        if (!state.holdId) {
          const holdInput = form.querySelector('input[name="holdId"]');
          const sessionInput = form.querySelector('input[name="sessionId"]');
          if (holdInput && holdInput.value) {
            setKaraokeState(container, { holdId: holdInput.value, sessionId: sessionInput?.value || state.sessionId });
          }
        }
        if (!getKaraokeState(container).holdId) {
          showStatus(container, '❌ Select a time and booth to continue.', 'error');
          return;
        }
        const submitButton = form.querySelector('.submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loadingSpinner = submitButton.querySelector('.loading-spinner');
        buttonText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
        submitButton.disabled = true;

        const supabase = await ensureSupabaseClient(config);
        const { data, error } = await karaokeFinalizeBooking(supabase, {
          holdId: state.holdId,
          sessionId: state.sessionId,
          customerName: bookingData.customerName,
          customerEmail: bookingData.customerEmail,
          customerPhone: bookingData.customerPhone,
          guestCount: bookingData.guestCount
        });

        if (error) {
          // Conflict/validation handling
          const status = error?.status || error?.code;
          if (status === 409 || status === 400 || status === 404) {
            showStatus(container, '❌ Couldn’t confirm – availability changed. Please reselect a slot.', 'error');
            await karaokeRefreshAvailability(container, config);
          } else {
            showStatus(container, '❌ Server error. Please try again.', 'error');
          }
        } else if (data?.success) {
          showStatus(container, `✅ Booking confirmed. ID: ${data.bookingId}`, 'success');
          clearKaraokeState(container, config, { clearSession: true });
          form.reset();
          // Reset default date to tomorrow (local)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          form.querySelector('input[name="bookingDate"]').value = formatDateLocal(tomorrow);
        } else {
          showStatus(container, '❌ Could not confirm booking. Please try again.', 'error');
        }
      } catch (err) {
        showStatus(container, `❌ Network error: ${err.message}`, 'error');
      } finally {
        const submitButton = form.querySelector('.submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loadingSpinner = submitButton.querySelector('.loading-spinner');
        buttonText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
        submitButton.disabled = false;
      }
      return;
    }

    // Show loading state
    const submitButton = form.querySelector('.submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline-block';
    submitButton.disabled = true;

    try {
      const base = (config.apiEndpoint || '').replace(/\/$/, '');
      const endpointUrl = /public-booking-api(\-v2)?$/i.test(base) ? base : `${base}/public-booking-api`;
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        showStatus(container, `✅ ${result.message}<br><strong>Booking ID:</strong> ${result.bookingId}`, 'success');
        
        // Reset form after successful submission
        setTimeout(() => {
          form.reset();
          showStatus(container, '', '');
          
          // Set default date based on booking type
          if (isVIPBooking) {
            const nextSaturday = getNextSaturday();
            form.querySelector('input[name="bookingDate"]').value = formatDateToISO(nextSaturday);
          } else {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            form.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
          }
        }, 3000);
      } else {
        showStatus(container, `❌ ${result.message}`, 'error');
      }
    } catch (error) {
      showStatus(container, `❌ Failed to create booking: ${error.message}`, 'error');
    } finally {
      // Reset button state
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
      submitButton.disabled = false;
    }
  }

    // Initialize widget
async function initWidget(container, config) {
    try {
      // Initialize widget data first
      await initializeWidgetData();
    
    // Create widget HTML after venue data is loaded
    container.innerHTML = createWidgetHTML(config);
    
    // Set default date based on booking type
    const isVIPBooking = config.bookingType === 'vip_tickets';
    const isKaraoke = config.bookingType === 'karaoke';
    if (isVIPBooking) {
      const nextSaturday = getNextSaturday();
      container.querySelector('input[name="bookingDate"]').value = formatDateToISO(nextSaturday);
    } else if (isKaraoke) {
      // Leave empty to avoid implying no availability before selection
      const input = container.querySelector('input[name="bookingDate"]');
      if (input) input.value = '';
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      container.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
    }
    
    // Populate venue areas for pre-configured venues and set default
    if (!isVIPBooking) {
      const venueSelect = container.querySelector('select[name="venue"]');
      const venueAreaSelect = container.querySelector('select[name="venueArea"]');
      
      // If venue is pre-configured (no venue dropdown), populate areas immediately
      if (!venueSelect && config.venue && config.venue !== 'both') {
        populateVenueAreas(config.venue, container);
        
        // Set default venue area if specified
        if (config.defaultVenueArea && venueAreaSelect) {
          // Use setTimeout to ensure options are populated first
          setTimeout(() => {
            venueAreaSelect.value = config.defaultVenueArea;
          }, 0);
        }
      }
      // If venue dropdown exists but has a pre-selected value, populate areas
      else if (venueSelect && venueSelect.value) {
        populateVenueAreas(venueSelect.value, container);
      }
      
      // Set default venue area if specified (for cases with venue dropdown)
      if (config.defaultVenueArea && venueAreaSelect) {
        setTimeout(() => {
          venueAreaSelect.value = config.defaultVenueArea;
        }, 0);
      }
    }
    
    // Add form submit handler
    const form = container.querySelector('#gm-booking-form');
    form.addEventListener('submit', (event) => handleSubmit(event, container, config));
    
    // Karaoke-specific handlers
    if (isKaraoke) {
      setupKaraokeHandlers(container, config);
    }

    // Add dynamic form event listeners for inline widget
    if (!isVIPBooking && !isKaraoke) {
      const venueSelect = container.querySelector('select[name="venue"]');
      const venueAreaSelect = container.querySelector('select[name="venueArea"]');
      const dateInput = container.querySelector('input[name="bookingDate"]');
      const guestCountInput = container.querySelector('input[name="guestCount"]');
      
      if (venueSelect) {
        // Venue change handler
        venueSelect.addEventListener('change', (e) => {
          const selectedVenue = e.target.value;
          if (selectedVenue) {
            populateVenueAreas(selectedVenue, container);
            // Clear time options when venue changes
            const startTimeSelect = container.querySelector('select[name="startTime"]');
            const endTimeSelect = container.querySelector('select[name="endTime"]');
            if (startTimeSelect) startTimeSelect.innerHTML = '<option value="">Select start time</option>';
            if (endTimeSelect) endTimeSelect.innerHTML = '<option value="">Select end time</option>';
          }
        });
      }
      
      if (venueAreaSelect) {
        // Venue area change handler
        venueAreaSelect.addEventListener('change', (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = e.target.value;
          
          if (selectedVenue && selectedArea) {
            populateTimeOptions(container);
          }
        });
      }
      
      if (dateInput) {
        // Date change handler
        dateInput.addEventListener('change', (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = venueAreaSelect ? venueAreaSelect.value : config.defaultVenueArea;
          
          if (selectedVenue && selectedArea) {
            populateTimeOptions();
          }
        });
      }
      
      if (guestCountInput) {
        // Guest count change handler for pricing
        guestCountInput.addEventListener('input', async (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = venueAreaSelect ? venueAreaSelect.value : config.defaultVenueArea;
          const selectedDate = dateInput ? dateInput.value : '';
          const guestCount = parseInt(e.target.value) || 0;
          
          if (selectedVenue && selectedArea && selectedDate && guestCount > 0) {
            await updatePricingDisplay(selectedVenue, selectedArea, selectedDate, guestCount, container);
          }
        });
      }
    } else {
      // VIP Tickets specific handlers
      const dateInput = container.querySelector('input[name="bookingDate"]');
      if (dateInput) {
        // Enhanced date picker for VIP tickets
        dateInput.addEventListener('change', (e) => {
          const selectedDate = new Date(e.target.value);
          if (!isSaturday(selectedDate)) {
            showStatus(container, '❌ VIP tickets are only available on Saturdays', 'error');
            e.target.value = formatDateToISO(getNextSaturday());
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to initialize booking widget:', error);
    container.innerHTML = `
      <div class="widget-error">
        <h3>⚠️ Booking System Unavailable</h3>
        <p>Unable to load venue information. Please try refreshing the page or contact support.</p>
        <small>Error: ${error.message}</small>
      </div>
    `;
  }
}

  // Initialize modal widget
  async function initModalWidget(config) {
    try {
      // Remove existing modal if present
      const existingModal = document.getElementById('gm-booking-modal');
      if (existingModal) {
        existingModal.remove();
      }

      // Initialize widget data first
      await initializeWidgetData();
    
    // Create modal overlay
    const modal = createModalOverlay(config);
    // Attach config for cleanup on close
    modal.__widgetConfig = config;
    
    // Insert form content directly into modal content (after header)
    const modalContent = modal.querySelector('.gm-booking-modal-content');
    const modalHeader = modalContent.querySelector('.gm-booking-modal-header');
    modalHeader.insertAdjacentHTML('afterend', createModalFormHTML(config));
    
    // For compatibility, create a reference to the modal content as formContainer
    const formContainer = modalContent;
    
    // Set default date based on booking type
    const isVIPBooking = config.bookingType === 'vip_tickets';
    const isKaraoke = config.bookingType === 'karaoke';
    if (isVIPBooking) {
      const nextSaturday = getNextSaturday();
      formContainer.querySelector('input[name="bookingDate"]').value = formatDateToISO(nextSaturday);
    } else if (isKaraoke) {
      // Leave empty to avoid implying no availability before selection
      const input = formContainer.querySelector('input[name="bookingDate"]');
      if (input) input.value = '';
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      formContainer.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
    }
    
    // Populate venue areas for pre-configured venues and set default
    if (!isVIPBooking) {
      const venueSelect = formContainer.querySelector('select[name="venue"]');
      const venueAreaSelect = formContainer.querySelector('select[name="venueArea"]');
      
      // If venue is pre-configured (no venue dropdown), populate areas immediately
      if (!venueSelect && config.venue && config.venue !== 'both') {
        populateVenueAreas(config.venue, formContainer);
        
        // Set default venue area if specified
        if (config.defaultVenueArea && venueAreaSelect) {
          // Use setTimeout to ensure options are populated first
          setTimeout(() => {
            venueAreaSelect.value = config.defaultVenueArea;
          }, 0);
        }
      }
      // If venue dropdown exists but has a pre-selected value, populate areas
      else if (venueSelect && venueSelect.value) {
        populateVenueAreas(venueSelect.value, formContainer);
      }
      
      // Set default venue area if specified (for cases with venue dropdown)
      if (config.defaultVenueArea && venueAreaSelect) {
        setTimeout(() => {
          venueAreaSelect.value = config.defaultVenueArea;
        }, 0);
      }
    }
    
    // Add form submit handler
    const form = formContainer.querySelector('#gm-booking-form');
    // IMPORTANT: pass formContainer (where karaoke state is stored), not the modal overlay
    form.addEventListener('submit', (event) => handleSubmit(event, formContainer, config));
    
    // Karaoke-specific handlers
    if (isKaraoke) {
      setupKaraokeHandlers(formContainer, config);
      // Release hold on modal close
      const closeBtn = modal.querySelector('.gm-booking-modal-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', async () => {
          await clearKaraokeState(formContainer, config, { releaseHold: true, clearSession: false });
        });
      }
    }

    // Add dynamic form event listeners for modal widget
    if (!isVIPBooking && !isKaraoke) {
      const venueSelect = formContainer.querySelector('select[name="venue"]');
      const venueAreaSelect = formContainer.querySelector('select[name="venueArea"]');
      const dateInput = formContainer.querySelector('input[name="bookingDate"]');
      const guestCountInput = formContainer.querySelector('input[name="guestCount"]');
      
      if (venueSelect) {
        // Venue change handler
        venueSelect.addEventListener('change', (e) => {
          const selectedVenue = e.target.value;
          if (selectedVenue) {
            populateVenueAreas(selectedVenue, formContainer);
            // Clear time options when venue changes
            const startTimeSelect = formContainer.querySelector('select[name="startTime"]');
            const endTimeSelect = formContainer.querySelector('select[name="endTime"]');
            if (startTimeSelect) startTimeSelect.innerHTML = '<option value="">Select start time</option>';
            if (endTimeSelect) endTimeSelect.innerHTML = '<option value="">Select end time</option>';
          }
        });
      }
      
      if (venueAreaSelect) {
        // Venue area change handler
        venueAreaSelect.addEventListener('change', (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = e.target.value;
          
          if (selectedVenue && selectedArea) {
            populateTimeOptions(formContainer);
          }
        });
      }
      
      if (dateInput) {
        // Date change handler
        dateInput.addEventListener('change', (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = venueAreaSelect ? venueAreaSelect.value : config.defaultVenueArea;
          
          if (selectedVenue && selectedArea) {
            populateTimeOptions();
          }
        });
      }
      
      if (guestCountInput) {
        // Guest count change handler for pricing
        guestCountInput.addEventListener('input', async (e) => {
          const selectedVenue = venueSelect ? venueSelect.value : config.venue;
          const selectedArea = venueAreaSelect ? venueAreaSelect.value : config.defaultVenueArea;
          const selectedDate = dateInput ? dateInput.value : '';
          const guestCount = parseInt(e.target.value) || 0;
          
          if (selectedVenue && selectedArea && selectedDate && guestCount > 0) {
            await updatePricingDisplay(selectedVenue, selectedArea, selectedDate, guestCount, formContainer);
          }
        });
      }
    } else {
      // VIP Tickets specific handlers
      const dateInput = formContainer.querySelector('input[name="bookingDate"]');
      if (dateInput) {
        // Enhanced date picker for VIP tickets
        dateInput.addEventListener('change', (e) => {
          const selectedDate = new Date(e.target.value);
          if (!isSaturday(selectedDate)) {
            showStatus(modal, '❌ VIP tickets are only available on Saturdays', 'error');
            e.target.value = formatDateToISO(getNextSaturday());
          }
        });
      }
    }
    
    // Show modal
    modal.style.display = 'flex';
  } catch (error) {
    console.error('Failed to initialize booking modal:', error);
    
    // Create error modal with consistent structure
    const errorModal = document.createElement('div');
    errorModal.id = 'gm-booking-modal';
    errorModal.className = 'gm-booking-modal-overlay';
    errorModal.style.display = 'flex';
    errorModal.innerHTML = `
      <div class="gm-booking-modal-content">
        <div class="gm-booking-modal-header">
          <h2 class="gm-booking-modal-title">⚠️ Booking System Unavailable</h2>
          <button class="gm-booking-modal-close" onclick="this.closest('#gm-booking-modal').remove()">&times;</button>
        </div>
        <div style="padding: 16px; text-align: center; color: #dc3545;">
          <p>Unable to load venue information. Please try refreshing the page or contact support.</p>
          <small style="color: #666; font-family: monospace;">Error: ${error.message}</small>
        </div>
      </div>
    `;
    document.body.appendChild(errorModal);
  }
}

  // Global functions for external use
  window.GMBookingWidget = {
    init: function(config = {}) {
      const defaultConfig = {
        ...window.GMBookingWidgetConfig,
        ...config
      };
      
      // Handle pre-configuration
      if (config.preConfig) {
        defaultConfig.venue = config.preConfig.venue;
        defaultConfig.bookingType = config.preConfig.bookingType;
      }
      
      return initWidget(document.body, defaultConfig);
    }
  };

  window.GMBookingModal = function(config = {}) {
    const defaultConfig = {
      ...window.GMBookingWidgetConfig,
      ...config
    };
    
    // Handle pre-configuration
    if (config.preConfig) {
      defaultConfig.venue = config.preConfig.venue;
      defaultConfig.bookingType = config.preConfig.bookingType;
    }
    
    return initModalWidget(defaultConfig);
  };

  window.closeBookingModal = function() {
    const modal = document.getElementById('gm-booking-modal');
    if (modal) {
      try {
        const config = modal.__widgetConfig;
        if (config && config.bookingType === 'karaoke') {
          const container = modal.querySelector('.gm-booking-modal-content');
          if (container) {
            // Best-effort release
            clearKaraokeState(container, config, { releaseHold: true, clearSession: false });
          }
        }
      } catch (_) { /* ignore */ }
      modal.remove();
    }
  };

  // Auto-initialize widgets on page load
  function autoInitWidgets() {
    const widgets = document.querySelectorAll('[data-gm-booking-widget]');
    widgets.forEach(widget => {
      const config = JSON.parse(widget.getAttribute('data-gm-booking-widget') || '{}');
      initWidget(widget, config);
    });
  }

  // Setup mutation observer for dynamically added widgets
  function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-gm-booking-widget')) {
            const config = JSON.parse(node.getAttribute('data-gm-booking-widget') || '{}');
            initWidget(node, config);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      autoInitWidgets();
      setupMutationObserver();
    });
  } else {
    autoInitWidgets();
    setupMutationObserver();
  }
})(); 