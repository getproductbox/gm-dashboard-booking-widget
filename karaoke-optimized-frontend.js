// Optimized karaoke availability functions for the frontend widget

// New optimized function to fetch capacities for multiple slots in one request
async function fetchKaraokeCapacitiesForSlots(config, { venue, bookingDate, minCapacity, slots }) {
  if (window.GMKaraokeAPI && typeof window.GMKaraokeAPI.fetchKaraokeCapacitiesForSlots === 'function') {
    return window.GMKaraokeAPI.fetchKaraokeCapacitiesForSlots(config, { venue, bookingDate, minCapacity, slots });
  }
  
  const supabase = await ensureSupabaseClient(config);
  return supabase.functions.invoke('karaoke-availability', {
    body: { 
      action: 'capacitiesForSlots',
      venue, 
      bookingDate, 
      minCapacity, 
      slots 
    }
  });
}

// Optimized version of hydrateSlotCapacities that uses batched requests
async function hydrateSlotCapacitiesOptimized(container, config) {
  const venue = (container.querySelector('select[name="venue"]')?.value) || config.venue;
  const bookingDate = container.querySelector('input[name="bookingDate"]').value;
  const guestCountStr = container.querySelector('input[name="guestCount"]').value;
  const minCapacity = Math.max(1, parseInt(guestCountStr || '0', 10));
  
  if (!venue || !bookingDate || !minCapacity) return;

  const buttons = Array.from(container.querySelectorAll('.karaoke-slot-btn'));
  
  // Filter out buttons that already have capacity chips
  const buttonsNeedingCapacities = buttons.filter(btn => !btn.querySelector('.cap-chips'));
  
  if (buttonsNeedingCapacities.length === 0) return;
  
  // Extract slot information from buttons
  const slots = buttonsNeedingCapacities.map(btn => ({
    startTime: btn.dataset.startTime,
    endTime: btn.dataset.endTime
  }));
  
  try {
    // 🚀 SINGLE API CALL for all slots instead of one per slot!
    const { data, error } = await fetchKaraokeCapacitiesForSlots(config, {
      venue,
      bookingDate,
      minCapacity,
      slots
    });
    
    if (error) {
      console.error('Error fetching slot capacities:', error);
      return;
    }
    
    // Apply capacities to each button
    buttonsNeedingCapacities.forEach(btn => {
      const startTime = btn.dataset.startTime;
      const endTime = btn.dataset.endTime;
      const slotKey = `${startTime}-${endTime}`;
      const capacities = data?.slotCapacities?.[slotKey] || [];
      
      if (capacities.length > 0 && !btn.querySelector('.cap-chips')) {
        btn.insertAdjacentHTML('beforeend', 
          `<div class="cap-chips">${capacities.map(c => `<span class="cap-chip">${c}</span>`).join('')}</div>`
        );
      }
    });
    
  } catch (err) {
    console.error('Error in optimized capacity hydration:', err);
  }
}

// Enhanced version that includes caching
async function hydrateSlotCapacitiesWithCache(container, config) {
  const venue = (container.querySelector('select[name="venue"]')?.value) || config.venue;
  const bookingDate = container.querySelector('input[name="bookingDate"]').value;
  const guestCountStr = container.querySelector('input[name="guestCount"]').value;
  const minCapacity = Math.max(1, parseInt(guestCountStr || '0', 10));
  
  if (!venue || !bookingDate || !minCapacity) return;

  // Check cache first
  const cacheKey = `capacities_${venue}_${bookingDate}_${minCapacity}`;
  const cached = dataCache.karaokeCapacities?.[cacheKey];
  const now = Date.now();
  
  if (cached && (now - cached.ts) < 60 * 1000) { // 60s TTL
    // Apply cached capacities
    applyCachedCapacities(container, cached.data);
    return;
  }

  const buttons = Array.from(container.querySelectorAll('.karaoke-slot-btn'));
  const buttonsNeedingCapacities = buttons.filter(btn => !btn.querySelector('.cap-chips'));
  
  if (buttonsNeedingCapacities.length === 0) return;
  
  const slots = buttonsNeedingCapacities.map(btn => ({
    startTime: btn.dataset.startTime,
    endTime: btn.dataset.endTime
  }));
  
  try {
    const { data, error } = await fetchKaraokeCapacitiesForSlots(config, {
      venue,
      bookingDate,
      minCapacity,
      slots
    });
    
    if (error) {
      console.error('Error fetching slot capacities:', error);
      return;
    }
    
    // Cache the result
    if (!dataCache.karaokeCapacities) dataCache.karaokeCapacities = {};
    dataCache.karaokeCapacities[cacheKey] = { data: data.slotCapacities, ts: now };
    
    // Apply capacities
    applyCachedCapacities(container, data.slotCapacities);
    
  } catch (err) {
    console.error('Error in cached capacity hydration:', err);
  }
}

// Helper function to apply cached capacities
function applyCachedCapacities(container, slotCapacities) {
  const buttons = Array.from(container.querySelectorAll('.karaoke-slot-btn'));
  
  buttons.forEach(btn => {
    if (btn.querySelector('.cap-chips')) return; // Already has capacities
    
    const startTime = btn.dataset.startTime;
    const endTime = btn.dataset.endTime;
    const slotKey = `${startTime}-${endTime}`;
    const capacities = slotCapacities?.[slotKey] || [];
    
    if (capacities.length > 0) {
      btn.insertAdjacentHTML('beforeend', 
        `<div class="cap-chips">${capacities.map(c => `<span class="cap-chip">${c}</span>`).join('')}</div>`
      );
    }
  });
}

// Performance monitoring function
function logPerformanceMetrics(operation, startTime, additionalData = {}) {
  const duration = Date.now() - startTime;
  console.log(`🎯 ${operation} completed in ${duration}ms`, additionalData);
  
  // You could send this to analytics
  if (window.gtag) {
    gtag('event', 'karaoke_performance', {
      operation,
      duration,
      ...additionalData
    });
  }
}

// Main optimized refresh function
async function karaokeRefreshAvailabilityOptimized(container, config) {
  const startTime = Date.now();
  
  try {
    const loading = container.querySelector('.karaoke-slots-loading');
    const slotsGroup = container.querySelector('.karaoke-slots-group');
    const dateVal = container.querySelector('input[name="bookingDate"]').value;
    
    if (!dateVal) {
      if (slotsGroup) slotsGroup.style.display = 'none';
      return;
    }
    
    if (slotsGroup) slotsGroup.style.display = 'block';
    if (loading) loading.style.display = 'flex';
    
    const venue = (container.querySelector('select[name="venue"]')?.value) || config.venue;
    const bookingDate = container.querySelector('input[name="bookingDate"]').value;
    const guestCountStr = container.querySelector('input[name="guestCount"]').value;
    const minCapacity = Math.max(1, parseInt(guestCountStr || '0', 10));
    
    // Get basic slot availability
    const { data, error } = await apiFetchKaraokeVenueSlots(config, {
      venue,
      bookingDate,
      minCapacity,
      granularityMinutes: 60
    });
    
    if (error) throw error;
    
    const slots = data?.slots || [];
    renderKaraokeSlots(container, slots);
    
    // Check if capacities are already included in the response
    const hasCaps = Array.isArray(slots) && slots.some(s => Array.isArray(s.capacities) && s.capacities.length);
    
    if (!hasCaps) {
      // Use optimized capacity fetching instead of individual requests
      await hydrateSlotCapacitiesWithCache(container, config);
    }
    
    logPerformanceMetrics('karaoke_availability_refresh', startTime, {
      venue,
      bookingDate,
      minCapacity,
      slotsCount: slots.length
    });
    
  } catch (err) {
    console.error('Error in optimized availability refresh:', err);
    showStatus(container, `❌ Failed to load availability. Please retry.`, 'error');
  } finally {
    const loading = container.querySelector('.karaoke-slots-loading');
    if (loading) loading.style.display = 'none';
  }
}

// Export the optimized functions
window.GMKaraokeOptimized = {
  fetchKaraokeCapacitiesForSlots,
  hydrateSlotCapacitiesOptimized,
  hydrateSlotCapacitiesWithCache,
  karaokeRefreshAvailabilityOptimized,
  logPerformanceMetrics
};


