// GM Booking Widget - Standalone Version
(function() {
  'use strict';

  // Widget configuration
  window.GMBookingWidgetConfig = window.GMBookingWidgetConfig || {
    apiEndpoint: 'https://plksvatjdylpuhjitbfc.supabase.co/functions/v1',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NDkzMywiZXhwIjoyMDY2MzQwOTMzfQ.M4Ikh3gSAVTPDxkMNrXLFxCPjHYqaBC5HcVavpHpNlk',
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

  // Format date for API
  function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
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

  function createModalOverlay(config) {
    // Remove existing modal if present
    const existingModal = document.getElementById('gm-booking-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modalHTML = `
      <div id="gm-booking-modal" class="gm-booking-modal-overlay">
        <div class="gm-booking-modal-backdrop"></div>
        <div class="gm-booking-modal-container">
          <div class="gm-booking-modal-content ${config.theme === 'dark' ? 'dark' : ''} ${config.bookingType === 'vip_tickets' ? 'vip-modal' : ''}">
            <div class="modal-header">
              <h2 class="modal-title">${config.bookingType === 'vip_tickets' ? 'Book VIP Tickets' : 'Book Your Venue'}</h2>
              <button class="modal-close" onclick="closeBookingModal()">&times;</button>
            </div>
            <div class="widget-form">
              <!-- Form content will be populated by createWidgetHTML -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Add backdrop click handler
    const backdrop = document.querySelector('.gm-booking-modal-backdrop');
    backdrop.addEventListener('click', closeBookingModal);

    return document.getElementById('gm-booking-modal');
  }

  function createModalFormHTML(config) {
    const isVIPBooking = config.bookingType === 'vip_tickets';
    
    // Get available venues from dynamic data
    let availableVenues = venueConfig || [];
    
    if (config.venue !== 'both' && config.venue) {
      availableVenues = availableVenues.filter(v => v.id === config.venue);
    }

    // VIP Tickets form fields (using direct modal approach that works)
    if (isVIPBooking) {
      return `
        <form id="gm-booking-form" class="direct-modal-form">
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
          
          ${!config.venue || config.venue === 'both' ? `
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Venue *</label>
                <select name="venue" class="form-select" required>
                  <option value="">Select venue</option>
                  ${availableVenues.map(venue => 
                    `<option value="${venue.id}">${venue.name}</option>`
                  ).join('')}
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
          
          ${config.showSpecialRequests ? `
            <div class="form-group">
              <label class="form-label">Special Requests</label>
              <textarea name="specialRequests" class="form-textarea" placeholder="VIP table request, dietary requirements..." rows="3"></textarea>
            </div>
          ` : ''}
          
          <button type="submit" class="submit-button">
            <span class="button-text">Book VIP Tickets</span>
            <span class="loading-spinner" style="display: none;">⏳</span>
          </button>
          
          <div id="widget-status" class="status-container"></div>
        </form>
      `;
    }

    // Venue Hire form fields (using direct modal approach that works)
    return `
      <form id="gm-booking-form" class="direct-modal-form">
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
        
        ${!config.venue || config.venue === 'both' ? `
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Venue *</label>
              <select name="venue" class="form-select" required>
                <option value="">Select venue</option>
                ${availableVenues.map(venue => 
                  `<option value="${venue.id}">${venue.name}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Venue Area *</label>
              <select name="venueArea" class="form-select" required>
                <option value="">Select area</option>
                <!-- Venue areas will be populated dynamically based on selected venue -->
              </select>
            </div>
          </div>
        ` : `
          <div class="form-group">
            <label class="form-label">Venue Area *</label>
            <select name="venueArea" class="form-select" required>
              <option value="">Select area</option>
              <!-- Venue areas will be populated dynamically based on selected venue -->
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
        
        ${config.showSpecialRequests ? `
          <div class="form-group">
            <label class="form-label">Special Requests</label>
            <textarea name="specialRequests" class="form-textarea" placeholder="Any special requirements..." rows="3"></textarea>
          </div>
        ` : ''}
        
        <button type="submit" class="submit-button">
          <span class="button-text">Create Booking</span>
          <span class="loading-spinner" style="display: none;">⏳</span>
        </button>
        
        <div id="widget-status" class="status-container"></div>
      </form>
    `;
  }

  function createWidgetHTML(config) {
    const themeClass = config.theme === 'dark' ? 'dark' : '';
    const isVIPBooking = config.bookingType === 'vip_tickets';
    
    // Get available venues from dynamic data
    let availableVenues = venueConfig || [];
    
    if (config.venue !== 'both' && config.venue) {
      availableVenues = availableVenues.filter(v => v.id === config.venue);
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
    
    const bookingData = {
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail') || undefined,
      customerPhone: formData.get('customerPhone') || undefined,
      bookingType: isVIPBooking ? 'vip_tickets' : 'venue_hire',
      venue: formData.get('venue') || config.venue,
      bookingDate: formData.get('bookingDate'),
      specialRequests: formData.get('specialRequests') || undefined,
    };

    if (isVIPBooking) {
      bookingData.ticketQuantity = parseInt(formData.get('ticketQuantity'));
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

    // Show loading state
    const submitButton = form.querySelector('.submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline-block';
    submitButton.disabled = true;

    try {
      const response = await fetch(`${config.apiEndpoint}/public-booking-api`, {
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
    if (isVIPBooking) {
      const nextSaturday = getNextSaturday();
      container.querySelector('input[name="bookingDate"]').value = formatDateToISO(nextSaturday);
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
    
    // Add dynamic form event listeners for inline widget
    if (!isVIPBooking) {
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
    
    // Create widget HTML after venue data is loaded
    const formContainer = modal.querySelector('.widget-form');
    formContainer.innerHTML = createModalFormHTML(config);
    
    // Set default date based on booking type
    const isVIPBooking = config.bookingType === 'vip_tickets';
    if (isVIPBooking) {
      const nextSaturday = getNextSaturday();
      formContainer.querySelector('input[name="bookingDate"]').value = formatDateToISO(nextSaturday);
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
    form.addEventListener('submit', (event) => handleSubmit(event, modal, config));
    
    // Add dynamic form event listeners for modal widget
    if (!isVIPBooking) {
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
    
    // Create error modal
    const errorModal = document.createElement('div');
    errorModal.id = 'gm-booking-modal';
    errorModal.className = 'gm-booking-modal-overlay';
    errorModal.style.display = 'flex';
    errorModal.innerHTML = `
      <div class="gm-booking-modal-backdrop" onclick="this.parentElement.remove()"></div>
      <div class="gm-booking-modal-container">
        <div class="gm-booking-modal-content">
          <div class="modal-header">
            <h2 class="modal-title">⚠️ Booking System Unavailable</h2>
            <button class="modal-close" onclick="this.closest('#gm-booking-modal').remove()">&times;</button>
          </div>
          <div style="padding: 32px;">
            <p>Unable to load venue information. Please try refreshing the page or contact support.</p>
            <small>Error: ${error.message}</small>
          </div>
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