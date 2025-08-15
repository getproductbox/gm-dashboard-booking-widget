(function(root){
	function createModalOverlay(config) {
		const existing = document.getElementById('gm-booking-modal');
		if (existing) existing.remove();
    	let modalTitle = 'Book Your Experience';
    	if (config.bookingType === 'vip_tickets') {
			modalTitle = config.venue === 'manor' ? 'Book Manor VIP Tickets' : (config.venue === 'hippie' ? 'Book Hippie VIP Tickets' : 'Book VIP Tickets');
		} else if (config.bookingType === 'venue_hire') {
			modalTitle = config.venue === 'manor' ? 'Book Manor Venue' : (config.venue === 'hippie' ? 'Book Hippie Venue' : 'Book Your Venue');
		} else if (config.bookingType === 'karaoke') {
			modalTitle = config.venue === 'manor' ? 'Book Manor Karaoke' : (config.venue === 'hippie' ? 'Book Hippie Karaoke' : 'Book Karaoke');
		}
		const html = `
		<div id="gm-booking-modal" class="gm-booking-modal-overlay">
			<div class="gm-booking-modal-content">
				<div class="gm-booking-modal-header">
					<h2 class="gm-booking-modal-title">${modalTitle}</h2>
					<button class="gm-booking-modal-close" onclick="closeBookingModal()">&times;</button>
				</div>
			</div>
		</div>`;
		document.body.insertAdjacentHTML('beforeend', html);
		const modal = document.getElementById('gm-booking-modal');
		modal.addEventListener('click', (e) => { if (e.target === modal) closeBookingModal(); });
		return modal;
	}

	root.GMModal = { createModalOverlay };
})(typeof window !== 'undefined' ? window : this);


