(function(root){
	function validateForm(formData, bookingType) {
		const errors = {};
		if (!formData.customerName || formData.customerName.trim().length === 0) errors.customerName = 'Customer name is required';
		if (!formData.customerEmail && !formData.customerPhone) errors.customerEmail = 'Either email or phone number is required';
		if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) errors.customerEmail = 'Please provide a valid email address';
		if (bookingType === 'vip_tickets') {
			if (!formData.venue) errors.venue = 'Please select a venue';
			if (!formData.bookingDate) errors.bookingDate = 'Please select a booking date';
			if (!formData.ticketQuantity || formData.ticketQuantity < 1 || formData.ticketQuantity > 100) errors.ticketQuantity = 'Ticket quantity must be between 1 and 100';
		} else if (bookingType === 'karaoke') {
			if (!formData.venue) errors.venue = 'Please select a venue';
			if (!formData.bookingDate) errors.bookingDate = 'Please select a booking date';
		} else {
			if (!formData.venue) errors.venue = 'Please select a venue';
			if (!formData.venueArea) errors.venueArea = 'Please select a venue area';
			if (!formData.bookingDate) errors.bookingDate = 'Please select a booking date';
			if (!formData.guestCount || formData.guestCount < 1) errors.guestCount = 'Guest count must be at least 1';
		}
		return { isValid: Object.keys(errors).length === 0, errors };
	}

	async function handleSubmit(event, container, config) {
		event.preventDefault();
		const form = event.target;
		const fd = new FormData(form);
		const isVIP = config.bookingType === 'vip_tickets';
		const isKaraoke = config.bookingType === 'karaoke';
		const data = {
			customerName: fd.get('customerName'),
			customerEmail: fd.get('customerEmail') || undefined,
			customerPhone: fd.get('customerPhone') || undefined,
			bookingType: isVIP ? 'vip_tickets' : (isKaraoke ? 'karaoke' : 'venue_hire'),
			venue: fd.get('venue') || config.venue,
			bookingDate: fd.get('bookingDate'),
			specialRequests: fd.get('specialRequests') || undefined,
		};
		if (isVIP) data.ticketQuantity = parseInt(fd.get('ticketQuantity'));
		else if (isKaraoke) {
			// For karaoke, guest count will be determined by the selected booth
			const state = (container.__karaokeStore && container.__karaokeStore.get()) || {};
			data.guestCount = state.selectedBoothCapacity || 1;
		}
		else { data.venueArea = fd.get('venueArea'); data.startTime = fd.get('startTime') || undefined; data.endTime = fd.get('endTime') || undefined; data.guestCount = parseInt(fd.get('guestCount')); }

		Object.keys(data).forEach(k => { if (data[k] === undefined) delete data[k]; });
		const validation = validateForm(data, config.bookingType);
		if (!validation.isValid) { const msg = Object.values(validation.errors).join(', '); (root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, `❌ ${msg}`, 'error'); return; }

        if (isKaraoke) {
            try {
                const state = (container.__karaokeStore && container.__karaokeStore.get()) || {};
                if (!state.holdId || !state.sessionId) {
                    (root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, '❌ Please select a time slot and a booth first.', 'error');
                    return;
                }
                const submitButton = form.querySelector('.submit-button');
                const buttonText = submitButton && submitButton.querySelector('.button-text');
                const loadingSpinner = submitButton && submitButton.querySelector('.loading-spinner');
                if (buttonText && loadingSpinner) { buttonText.style.display = 'none'; loadingSpinner.style.display = 'inline-block'; }
                if (submitButton) submitButton.disabled = true;
                const { data: resp, error } = await root.apiKaraokeFinalizeBooking(config, {
                    holdId: state.holdId,
                    sessionId: state.sessionId,
                    customerName: data.customerName,
                    customerEmail: data.customerEmail,
                    customerPhone: data.customerPhone,
                    guestCount: data.guestCount
                });
                if (error || resp?.error) throw new Error(error?.message || resp?.error || 'Failed');
                
                // Show success message
                (root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, `✅ Booking confirmed! ID: ${resp?.bookingId || 'N/A'}`, 'success');
                
                // Close modal after a brief delay to let user see success message
                setTimeout(() => {
                    if (root.closeBookingModal) {
                        root.closeBookingModal();
                    }
                }, 2000);
            } catch (err) {
                (root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, `❌ ${err.message}`, 'error');
            } finally {
                const submitButton = form.querySelector('.submit-button');
                const buttonText = submitButton && submitButton.querySelector('.button-text');
                const loadingSpinner = submitButton && submitButton.querySelector('.loading-spinner');
                if (submitButton) submitButton.disabled = false;
                if (buttonText && loadingSpinner) { buttonText.style.display = 'inline'; loadingSpinner.style.display = 'none'; }
            }
            return;
        }

		// Venue hire / VIP via public booking API
		const submitButton = form.querySelector('.submit-button');
		const buttonText = submitButton.querySelector('.button-text');
		const loadingSpinner = submitButton.querySelector('.loading-spinner');
		buttonText.style.display = 'none'; loadingSpinner.style.display = 'inline-block'; submitButton.disabled = true;
		try {
			const resp = await root.GMBookingAPI.submitPublicBooking(config, data);
			(root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, `✅ ${resp.message || 'Booking confirmed!'}`, 'success');
			
			// Close modal after a brief delay to let user see success message
			setTimeout(() => {
				if (root.closeBookingModal) {
					root.closeBookingModal();
				}
			}, 2000);
		} catch (err) {
			(root.GMCore && root.GMCore.showStatus) && root.GMCore.showStatus(container, `❌ Failed to create booking: ${err.message}`, 'error');
		} finally {
			buttonText.style.display = 'inline'; loadingSpinner.style.display = 'none'; submitButton.disabled = false;
		}
	}

	root.GMForms = { validateForm, handleSubmit };
})(typeof window !== 'undefined' ? window : this);


