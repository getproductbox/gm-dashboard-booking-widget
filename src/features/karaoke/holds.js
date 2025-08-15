(function(root){
	function startHoldCountdown(container, config, opts = {}) {
		const state = (container.__karaokeStore && container.__karaokeStore.get()) || {};
		const holdWrap = container.querySelector('.karaoke-hold');
		const countdown = container.querySelector('.hold-countdown');
		if (!holdWrap || !countdown || !state.holdExpiresAt) return;
		holdWrap.style.display = 'block';

		if (state.countdownIntervalId) clearInterval(state.countdownIntervalId);
		if (container.__karaokeStore) container.__karaokeStore.set({ didAutoExtend: false }, 'countdown-reset');

		function update() {
			const now = Date.now();
			const s = (container.__karaokeStore && container.__karaokeStore.get()) || {};
			const distance = new Date(s.holdExpiresAt).getTime() - now;
			if (distance <= 0) {
				const st = (container.__karaokeStore && container.__karaokeStore.get()) || {};
				if (st.countdownIntervalId) clearInterval(st.countdownIntervalId);
				countdown.textContent = '00:00';
				return;
			}
			const minutes = Math.floor(distance / 60000);
			const seconds = Math.floor((distance % 60000) / 1000);
			countdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

			if (!s.didAutoExtend && distance <= 60000 && s.holdId) {
				container.__karaokeStore && container.__karaokeStore.set({ didAutoExtend: true }, 'auto-extend');
				if (typeof root.apiKaraokeExtendHold === 'function') {
					root.apiKaraokeExtendHold(config, { holdId: s.holdId, sessionId: s.sessionId, ttlMinutes: 10 }).catch(() => {});
				}
			}
		}
		update();
		const id = setInterval(update, 1000);
		container.__karaokeStore && container.__karaokeStore.set({ countdownIntervalId: id }, 'countdown-start');
	}

	function clearHoldState(container, config, opts = { releaseHold: false, clearSession: false }) {
		const s = (container.__karaokeStore && container.__karaokeStore.get()) || {};
		if (s.countdownIntervalId) {
			clearInterval(s.countdownIntervalId);
			container.__karaokeStore && container.__karaokeStore.set({ countdownIntervalId: null }, 'countdown-stop');
		}
		if (opts.releaseHold && s.holdId && typeof root.apiKaraokeReleaseHold === 'function') {
			root.apiKaraokeReleaseHold(config, { holdId: s.holdId, sessionId: s.sessionId }).catch(()=>{});
		}
		container.__karaokeStore && container.__karaokeStore.set({
			selectedSlot: null,
			holdId: null,
			holdExpiresAt: null,
			didAutoExtend: false
		}, 'hold-clear');
	}

	root.GMKaraokeHolds = { startHoldCountdown, clearHoldState };
})(typeof window !== 'undefined' ? window : this);



