// Public entry that re-exports the monolith internals via GMInternal.
// Defines the stable global API and page bootstrapping.

// Ensure GMInternal functions exist by re-hosting monolith internals during build concat
(function(root){
	function init(containerOrConfig, maybeConfig) {
		const isElement = containerOrConfig && containerOrConfig.nodeType === 1;
		const container = isElement ? containerOrConfig : null;
		const config = isElement ? (maybeConfig || {}) : (maybeConfig || containerOrConfig || {});
		const base = (root.GMBookingWidgetConfig || {});
		const effectiveVenue = (config && config.venue) || (config && config.preConfig && config.preConfig.venue) || base.venue;
		const effectiveBookingType = (config && config.bookingType) || (config && config.preConfig && config.preConfig.bookingType) || base.bookingType;
		const defaults = { ...base, ...config, venue: effectiveVenue, bookingType: effectiveBookingType };
		if (root.console && root.GMBookingWidgetConfig?.debug) {
			console.log('[GM] init()', { container: !!container, config, defaults });
		}
		if (defaults.__openModal === true) {
			return root.GMInternal && root.GMInternal.initModalWidget
				? root.GMInternal.initModalWidget(defaults)
				: null;
		}
		const target = container || document.body;
		return root.GMInternal && root.GMInternal.initWidget
			? root.GMInternal.initWidget(target, defaults)
			: null;
	}

	function GMBookingModal(config = {}) {
		return init(null, { ...config, __openModal: true });
	}

	function closeBookingModal() {
		return root.GMInternal && root.GMInternal.closeBookingModal
			? root.GMInternal.closeBookingModal()
			: undefined;
	}

	function autoInitWidgets() {
		const widgets = document.querySelectorAll('[data-gm-booking-widget]');
		widgets.forEach(widget => {
			const config = JSON.parse(widget.getAttribute('data-gm-booking-widget') || '{}');
			init(widget, config);
		});
	}

	function setupMutationObserver() {
		const observer = new MutationObserver((mutations) => {
			mutations.forEach((mutation) => {
				mutation.addedNodes.forEach((node) => {
					if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-gm-booking-widget')) {
						const config = JSON.parse(node.getAttribute('data-gm-booking-widget') || '{}');
						init(node, config);
					}
				});
			});
		});
		observer.observe(document.body, { childList: true, subtree: true });
	}

	root.GMBookingWidget = { init };
	root.GMBookingModal = GMBookingModal;
	root.closeBookingModal = closeBookingModal;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => {
			autoInitWidgets();
			setupMutationObserver();
		});
	} else {
		autoInitWidgets();
		setupMutationObserver();
	}
})(typeof window !== 'undefined' ? window : this);

