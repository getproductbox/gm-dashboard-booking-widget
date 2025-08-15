(function(root){
    function initModalWidget(config) {
        if (root.GMBookingWidgetConfig?.debug) console.log('[Modal Init] Creating modal with config:', config);
		
		// Create the modal overlay
		const modal = root.GMModal.createModalOverlay(config);
		const modalContent = modal.querySelector('.gm-booking-modal-content');
		
		// Generate the form content based on booking type
        let formContent = '';
		
		if (config.bookingType === 'karaoke') {
			formContent = generateKaraokeForm(config);
		} else if (config.bookingType === 'vip_tickets') {
			formContent = generateVIPTicketsForm(config);
		} else if (config.bookingType === 'venue_hire') {
			formContent = generateVenueHireForm(config);
		} else {
			formContent = generateGenericForm(config);
		}
		
		// Insert the form content and wrap with class names that match CSS
        const formEl = document.createElement('form');
        formEl.id = 'gm-booking-form';
        formEl.className = 'gm-booking-modal-form';
        formEl.innerHTML = formContent;
        modalContent.appendChild(formEl);
		
		// Initialize the appropriate controller
		if (config.bookingType === 'karaoke') {
			if (root.GMKaraokeController && root.GMKaraokeController.init) {
				root.GMKaraokeController.init(modal, config);
			}
		}
		
		// Set up form submission
        const form = modal.querySelector('#gm-booking-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                if (root.GMForms && root.GMForms.handleSubmit) {
                    // Pass modal as the container along with config
                    root.GMForms.handleSubmit(e, modal, config);
                }
            });
        }
		
		// Show the modal
		setTimeout(() => modal.classList.add('active'), 10);
		
		return modal;
	}
	
    function generateKaraokeForm(config) {
        return `
            <div class="gm-booking-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-date">Date *</label>
                        <input class="form-input" type="date" id="karaoke-date" name="bookingDate" required autofocus>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-venue">Venue</label>
                        <select class="form-select" id="karaoke-venue" name="venue">
                            <option value="manor" ${config.venue === 'manor' ? 'selected' : ''}>Manor</option>
                            <option value="hippie" ${config.venue === 'hippie' ? 'selected' : ''}>Hippie</option>
                        </select>
                    </div>
                </div>
                
                <div class="karaoke-slots-group" style="display: none;">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Available Time Slots</label>
                            <div class="karaoke-slots-loading" style="display: none; gap: 8px; align-items: center;">
                                <span class="gm-spinner"></span>
                                <span>Loading slots...</span>
                            </div>
                            <div class="karaoke-slots-grid"></div>
                        </div>
                    </div>
                    
                    <div class="karaoke-booths-group" style="display: none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Select Booth</label>
                                <div class="karaoke-booths-loading" style="display: none; gap: 8px; align-items: center;">
                                    <span class="gm-spinner"></span>
                                    <span>Loading booths...</span>
                                </div>
                                <div class="karaoke-booths-select"><select name="boothId" class="form-select"></select></div>
                                <div class="karaoke-hold" style="display:none; margin-top:8px;">
                                    <div class="hold-timer">Booth held for <span class="hold-countdown">05:00</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                <div class="karaoke-hold" style="display: none;">
                    <div class="hold-timer">Booth held for <span class="hold-countdown">05:00</span></div>
                    <button type="button" class="hold-extend-btn">Extend Hold</button>
                </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-name">Name *</label>
                        <input class="form-input" type="text" id="karaoke-name" name="customerName" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-email">Email *</label>
                        <input class="form-input" type="email" id="karaoke-email" name="customerEmail" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-phone">Phone *</label>
                        <input class="form-input" type="tel" id="karaoke-phone" name="customerPhone" required>
                    </div>
                </div>
                
                ${config.showSpecialRequests ? `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="karaoke-special">Special Requests</label>
                        <textarea class="form-textarea" id="karaoke-special" name="specialRequests" rows="3"></textarea>
                    </div>
                </div>
                ` : ''}
                
                <div id="widget-status" class="status-container"></div>
                
                <div class="form-row">
                    <button type="submit" class="submit-button"><span class="button-text">Book Karaoke</span><span class="loading-spinner" style="display:none"></span></button>
                </div>
            </div>
        `;
    }
	
    function generateVIPTicketsForm(config) {
		return `
            <div class="gm-booking-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-date">Date *</label>
                        <input class="form-input" type="date" id="vip-date" name="bookingDate" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-venue">Venue</label>
                        <select class="form-select" id="vip-venue" name="venue">
                            <option value="manor" ${config.venue === 'manor' ? 'selected' : ''}>Manor</option>
                            <option value="hippie" ${config.venue === 'hippie' ? 'selected' : ''}>Hippie</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-tickets">Number of Tickets *</label>
                        <input class="form-input" type="number" id="vip-tickets" name="ticketQuantity" min="1" max="100" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-name">Name *</label>
                        <input class="form-input" type="text" id="vip-name" name="customerName" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-email">Email *</label>
                        <input class="form-input" type="email" id="vip-email" name="customerEmail" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-phone">Phone *</label>
                        <input class="form-input" type="tel" id="vip-phone" name="customerPhone" required>
                    </div>
                </div>
                
                ${config.showSpecialRequests ? `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="vip-special">Special Requests</label>
                        <textarea class="form-textarea" id="vip-special" name="specialRequests" rows="3"></textarea>
                    </div>
                </div>
                ` : ''}
                
                <div id="widget-status" class="status-container"></div>
                
                <div class="form-row">
                    <button type="submit" class="submit-button vip-style"><span class="button-text">Book VIP Tickets</span><span class="loading-spinner" style="display:none"></span></button>
                </div>
            </div>
		`;
	}
	
    function generateVenueHireForm(config) {
		return `
            <div class="gm-booking-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-date">Date *</label>
                        <input class="form-input" type="date" id="venue-date" name="bookingDate" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-venue">Venue</label>
                        <select class="form-select" id="venue-venue" name="venue">
                            <option value="manor" ${config.venue === 'manor' ? 'selected' : ''}>Manor</option>
                            <option value="hippie" ${config.venue === 'hippie' ? 'selected' : ''}>Hippie</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-area">Venue Area</label>
                        <select class="form-select" id="venue-area" name="venueArea">
                            <option value="upstairs" ${config.defaultVenueArea === 'upstairs' ? 'selected' : ''}>Upstairs</option>
                            <option value="downstairs" ${config.defaultVenueArea === 'downstairs' ? 'selected' : ''}>Downstairs</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-guests">Number of Guests *</label>
                        <input class="form-input" type="number" id="venue-guests" name="guestCount" min="1" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-name">Name *</label>
                        <input class="form-input" type="text" id="venue-name" name="customerName" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-email">Email *</label>
                        <input class="form-input" type="email" id="venue-email" name="customerEmail" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-phone">Phone *</label>
                        <input class="form-input" type="tel" id="venue-phone" name="customerPhone" required>
                    </div>
                </div>
                
                ${config.showSpecialRequests ? `
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label" for="venue-special">Special Requests</label>
                        <textarea class="form-textarea" id="venue-special" name="specialRequests" rows="3"></textarea>
                    </div>
                </div>
                ` : ''}
                
                <div id="widget-status" class="status-container"></div>
                
                <div class="form-row">
                    <button type="submit" class="submit-button"><span class="button-text">Book Venue</span><span class="loading-spinner" style="display:none"></span></button>
                </div>
            </div>
		`;
	}
	
	function generateGenericForm(config) {
		return `
			<div class="gm-booking-form">
				<div class="gm-form-row">
					<div class="gm-form-group">
						<label for="generic-name">Name *</label>
						<input type="text" id="generic-name" name="customerName" required>
					</div>
				</div>
				
				<div class="gm-form-row">
					<div class="gm-form-group">
						<label for="generic-email">Email *</label>
						<input type="email" id="generic-email" name="customerEmail" required>
					</div>
				</div>
				
				<div class="gm-form-row">
					<div class="gm-form-group">
						<label for="generic-phone">Phone *</label>
						<input type="tel" id="generic-phone" name="customerPhone" required>
					</div>
				</div>
				
				<div class="gm-form-row">
					<button type="submit" class="gm-submit-btn">Submit Booking</button>
				</div>
			</div>
		`;
	}
	
	function closeBookingModal() {
		const modal = document.getElementById('gm-booking-modal');
		if (modal) {
			modal.classList.remove('active');
			setTimeout(() => modal.remove(), 300);
		}
	}
	
	// Expose the functions
	root.GMInternal = root.GMInternal || {};
	root.GMInternal.initModalWidget = initModalWidget;
	root.GMInternal.closeBookingModal = closeBookingModal;
})(typeof window !== 'undefined' ? window : this);
