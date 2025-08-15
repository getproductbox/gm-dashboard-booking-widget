(function(root){
	function init(container, config) {
        // Ensure karaoke state store exists (sessionId, etc.)
        if (typeof root.GMStateCompat?.getKaraokeState === 'function') {
            root.GMStateCompat.getKaraokeState(container);
        }
        if (root.GMBookingWidgetConfig?.debug) {
            console.log('[Karaoke Controller] Initializing with config:', config);
        }
		
        const venueSelect = container.querySelector('select[name="venue"]');
        const dateInput = container.querySelector('input[name="bookingDate"]');
        const guestInput = container.querySelector('input[name="guestCount"]');
        const slotsGrid = container.querySelector('.karaoke-slots-grid');
        const boothsWrap = container.querySelector('.karaoke-booths-group');
        const boothsSelect = container.querySelector('.karaoke-booths-select select');
        // If the select exists, ensure it has a name attribute used elsewhere
        if (boothsSelect && !boothsSelect.name) boothsSelect.name = 'boothId';
        const holdCancelBtn = container.querySelector('.hold-cancel');
		
        if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke Controller] Found elements:', {
			venueSelect: !!venueSelect,
			dateInput: !!dateInput,
			slotsGrid: !!slotsGrid,
			boothsWrap: !!boothsWrap,
			boothsSelect: !!boothsSelect
		});
		
		// Debug: Log the actual container HTML to see what we're working with
        if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke Controller] Container HTML:', container.innerHTML);

		async function clearState(opts) {
			if (root.GMKaraokeHolds) {
				root.GMKaraokeHolds.clearHoldState(container, config, opts);
			}
            const select = container.querySelector('select[name="boothId"]');
            const wrap = container.querySelector('.karaoke-booths-group');
			const holdWrap = container.querySelector('.karaoke-hold');
			if (select) select.innerHTML = '<option value="">Select a booth</option>';
			if (wrap) wrap.style.display = 'none';
			if (holdWrap) holdWrap.style.display = 'none';
		}

		async function refreshAvailability() {
			if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] ===== refreshAvailability() called =====');
			const loading = container.querySelector('.karaoke-slots-loading');
			const slotsGroup = container.querySelector('.karaoke-slots-group');
			const dateVal = dateInput && dateInput.value;
			if (!dateVal) {
				if (slotsGroup) slotsGroup.style.display = 'none';
				if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] No date value, exiting refreshAvailability');
				return;
			}
			if (slotsGroup) slotsGroup.style.display = 'block';
			if (loading) loading.style.display = 'flex';
			const venue = (venueSelect && venueSelect.value) || config.venue;
			const bookingDate = dateInput.value;
			
            if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] Fetching slots for:', { venue, bookingDate });
			if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] Call stack:', new Error().stack);
			
			// Remove guest count dependency - show all available slots
			const { data, error } = await root.apiFetchKaraokeVenueSlots(config, {
				venue,
				bookingDate,
				minCapacity: 1, // Always show all slots
				granularityMinutes: 60
			});
			
            if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] API response:', { data, error });
			
			if (error) throw error;
			const slots = (data && data.slots) || [];
			
			// Render slots using the UI component
            const grid = container.querySelector('.karaoke-slots-grid');
            const empty = container.querySelector('.karaoke-empty');
			if (loading) loading.style.display = 'none';
			
            if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] Rendering slots:', { totalSlots: slots.length, availableSlots: slots.filter(s => s.available).length });
			
			if (!grid) {
				console.error('[Karaoke] No grid element found');
				return;
			}
			
			// Force clear the grid completely
			grid.innerHTML = '';
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] Grid cleared. Grid innerHTML after clear:', grid.innerHTML);
				console.log('[Karaoke] Grid children count after clear:', grid.children.length);
			}
			
			// Only show available slots
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] All slots received:', slots.map(s => ({ 
					time: `${s.startTime} - ${s.endTime}`, 
					available: s.available 
				})));
			}
			
			const availableSlots = (slots || []).filter(s => s.available === true);
			
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] Filtered available slots:', availableSlots.map(s => ({ 
					time: `${s.startTime} - ${s.endTime}`, 
					available: s.available 
				})));
			}
			
			// For now, trust the availability API and show all slots it returns as available
			// The booth checking will happen when user clicks a slot (more efficient)
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] Using slots from availability API (booth check on click)');
			}

			const slotsWithBooths = availableSlots;

			const finalAvailableSlots = slotsWithBooths;
			
			// Cache slot data for later use by onSlotClick
			container.__slotData = finalAvailableSlots;
			
			if (finalAvailableSlots.length === 0) {
                if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] No slots with available booths, showing empty state');
				if (empty) empty.style.display = 'block';
				return;
			}
			if (empty) empty.style.display = 'none';
			
			const state = (container.__karaokeStore && container.__karaokeStore.get()) || {};
			finalAvailableSlots.forEach((slot, index) => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'karaoke-slot-btn';
				
				// Show time range and available booth capacities  
				const capacityText = Array.isArray(slot.capacities) && slot.capacities.length > 0
					? `Cap: ${slot.capacities.join(', ')}`
					: '';
				
				btn.innerHTML = `
					<div class="slot-time">${slot.startTime} – ${slot.endTime}</div>
					<div class="slot-capacity">${capacityText}</div>
				`;
				btn.dataset.startTime = slot.startTime;
				btn.dataset.endTime = slot.endTime;
				if (state.selectedSlot && state.selectedSlot.startTime === slot.startTime && state.selectedSlot.endTime === slot.endTime) {
					btn.classList.add('selected');
				}
				grid.appendChild(btn);
				if (root.GMBookingWidgetConfig?.debug) {
					console.log(`[Karaoke] Added slot ${index + 1}:`, slot.startTime, '-', slot.endTime);
				}
			});
			
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] Final grid children count:', grid.children.length);
				console.log('[Karaoke] Final grid innerHTML length:', grid.innerHTML.length);
			}
			
			// Do not call any legacy hydrate functions - we only show slots returned by the API
		}

		async function onSlotClick(e) {
			const target = e.target.closest('.karaoke-slot-btn');
			if (!target) return;
			const startTime = target.dataset.startTime;
			const endTime = target.dataset.endTime;

			const buttons = container.querySelectorAll('.karaoke-slot-btn');
			buttons.forEach(b => b.classList.remove('selected'));
			target.classList.add('selected');

			await clearState({ releaseHold: true, clearSession: false });
			container.__karaokeStore && container.__karaokeStore.set({ selectedSlot: { startTime, endTime } }, 'slot-select');
			root.showStatus && root.showStatus(container, '', '');

			const boothsLoading = container.querySelector('.karaoke-booths-loading');
			boothsWrap.style.display = 'block';
			if (boothsLoading) boothsLoading.style.display = 'flex';
			if (boothsSelect) {
				boothsSelect.disabled = true;
				boothsSelect.style.display = 'none'; // Hide dropdown while loading
			}

			// Prefer cached booth data if included with availability results
			let booths = [];
			let usedCached = false;
			if (Array.isArray(container.__slotData)) {
				const cached = container.__slotData.find(s => s.startTime === startTime && s.endTime === endTime);
				if (cached && Array.isArray(cached.availableBooths) && cached.availableBooths.length) {
					booths = cached.availableBooths;
					usedCached = true;
					if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] Using cached availableBooths:', booths.length);
				}
			}

			// If not cached, fetch from API
			if (!usedCached) {
				try {
					const venue = (venueSelect && venueSelect.value) || config.venue;
					const bookingDate = dateInput.value;
					const { data, error } = await root.apiFetchKaraokeBoothsForSlot(config, { venue, bookingDate, startTime, endTime, minCapacity: 1 });
					if (error) throw error;
					booths = (data && data.availableBooths) || [];
					if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke] Fetched booths for slot:', booths.length);
				} catch (err) {
					if (boothsLoading) boothsLoading.style.display = 'none';
					if (boothsSelect) boothsSelect.disabled = false;
					root.showStatus && root.showStatus(container, '❌ Failed to load booths. Please try another slot.', 'error');
					return;
				}
			} else {
				// Hide spinner quickly when using cache
				if (boothsLoading) boothsLoading.style.display = 'none';
			}

			// Populate booth select
			if (boothsSelect) {
				boothsSelect.innerHTML = '<option value="">Select a booth</option>' + booths.map(b => {
					const currency = '£';
					const rate = (typeof b.hourly_rate === 'number') ? `${currency}${b.hourly_rate.toFixed(2)}` : `${currency}${b.hourly_rate}`;
					return `<option value="${b.id}">${b.name} — cap ${b.capacity} (${rate}/hour)</option>`;
				}).join('');
				
				// User must manually select a booth - no auto-selection
			}
			
			// Show dropdown and enable it after loading is complete
			if (boothsLoading) boothsLoading.style.display = 'none';
			if (boothsSelect) {
				boothsSelect.disabled = false;
				boothsSelect.style.display = 'block'; // Show dropdown after loading
			}
		}

		async function onBoothChange(e) {
			const boothId = e.target.value;
			const state = (container.__karaokeStore && container.__karaokeStore.get()) || {};
			if (root.GMBookingWidgetConfig?.debug) {
				console.log('[Karaoke] Booth change:', { boothId, hasStore: !!container.__karaokeStore, state });
			}
			if (!boothId || !state.selectedSlot) {
				if (root.GMBookingWidgetConfig?.debug) {
					console.log('[Karaoke] Booth change aborted:', { boothId, selectedSlot: state.selectedSlot });
				}
				return;
			}
			try {
				const venue = (venueSelect && venueSelect.value) || config.venue;
				const bookingDate = dateInput.value;
				const { startTime, endTime } = state.selectedSlot;
				// Get the selected booth capacity
				const selectedBooth = boothsSelect.options[boothsSelect.selectedIndex];
				const boothCapacity = selectedBooth ? parseInt(selectedBooth.text.match(/cap (\d+)/)?.[1] || '1') : 1;
				
				const { data, error } = await root.apiKaraokeCreateHold(config, {
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
					const status = error.status || error.code;
					if (status === 409 || status === 400) {
						root.showStatus && root.showStatus(container, '❌ That slot just got taken. Please pick another time.', 'error');
						await refreshAvailability();
					} else {
						root.showStatus && root.showStatus(container, '❌ Could not create hold. Please try a different slot.', 'error');
					}
					return;
				}
				const holdId = (data && (data.holdId || data.id));
				const expiresAt = (data && (data.expires_at || new Date(Date.now() + 10 * 60 * 1000).toISOString()));
				container.__karaokeStore && container.__karaokeStore.set({ 
					holdId, 
					holdExpiresAt: expiresAt,
					selectedBoothCapacity: boothCapacity 
				}, 'hold-created');
				root.GMKaraokeHolds && root.GMKaraokeHolds.startHoldCountdown(container, config);
				// Mirror hidden inputs
				const form = container.querySelector('#gm-booking-form');
				if (form) {
					let holdInput = form.querySelector('input[name="holdId"]');
					if (!holdInput) { holdInput = document.createElement('input'); holdInput.type = 'hidden'; holdInput.name = 'holdId'; form.appendChild(holdInput); }
					holdInput.value = String(holdId || '');
					let sessionInput = form.querySelector('input[name="sessionId"]');
					if (!sessionInput) { sessionInput = document.createElement('input'); sessionInput.type = 'hidden'; sessionInput.name = 'sessionId'; form.appendChild(sessionInput); }
					const stateNow = (container.__karaokeStore && container.__karaokeStore.get()) || {};
					sessionInput.value = String(stateNow.sessionId || '');
				}
				root.showStatus && root.showStatus(container, '', '');
			} catch (err) {
				root.showStatus && root.showStatus(container, `❌ Network error: ${err.message}`, 'error');
			}
		}

		async function onCancelHold() {
			await clearState({ releaseHold: true, clearSession: false });
			const buttons = container.querySelectorAll('.karaoke-slot-btn');
			buttons.forEach(b => { b.disabled = false; b.classList.remove('selected'); });
		}

		async function loadSlots() {
			await clearState({ releaseHold: true, clearSession: false });
			await refreshAvailability();
		}

		[venueSelect, dateInput].forEach(el => {
			if (!el) return;
			el.addEventListener('change', loadSlots);
		});

		if ((venueSelect && venueSelect.value) || config.venue) {
			if (dateInput && dateInput.value) {
                if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke Controller] Date has value, loading slots');
				loadSlots();
			} else {
                if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke Controller] No date value, hiding slots group');
				const group = container.querySelector('.karaoke-slots-group');
				if (group) group.style.display = 'none';
			}
		} else {
                if (root.GMBookingWidgetConfig?.debug) console.log('[Karaoke Controller] No venue selected');
		}
		
        // Keep slots hidden until a date is selected; do not show loading on open

		if (slotsGrid) {
			slotsGrid.addEventListener('click', onSlotClick);
		}

		if (boothsSelect) {
			boothsSelect.addEventListener('change', onBoothChange);
            // In case the browser restores a default value, fire change if a value exists
            if (boothsSelect.value) {
                onBoothChange({ target: boothsSelect });
            }
		}

		if (holdCancelBtn) {
			holdCancelBtn.addEventListener('click', onCancelHold);
		}
	}

	root.GMKaraokeController = { init };
})(typeof window !== 'undefined' ? window : this);



