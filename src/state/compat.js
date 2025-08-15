(function(root){
	function getKaraokeState(container) {
		if (!container.__karaokeStore) {
			const initial = {
				sessionId: (function(){
					try { return localStorage.getItem('karaoke_session_id') || null; } catch(_) { return null; }
				})(),
				selectedSlot: null,
				minCapacity: null,
				holdId: null,
				holdExpiresAt: null,
				countdownIntervalId: null,
				didAutoExtend: false
			};
			if (!initial.sessionId) {
				const id = (root.crypto && root.crypto.randomUUID) ? root.crypto.randomUUID() : String(Date.now());
				try { localStorage.setItem('karaoke_session_id', id); } catch(_) {}
				initial.sessionId = id;
			}
			const store = (root.GMStore && typeof root.GMStore.createStore === 'function')
				? root.GMStore.createStore(initial)
				: { get: () => initial, set: (u)=>Object.assign(initial,u), subscribe: () => () => {} };
			container.__karaokeStore = store;
		}
		return container.__karaokeStore.get();
	}

	function setKaraokeState(container, updates, action) {
		if (!container.__karaokeStore) getKaraokeState(container);
		return container.__karaokeStore.set(updates, action || 'update');
	}

	root.GMStateCompat = { getKaraokeState, setKaraokeState };
})(typeof window !== 'undefined' ? window : this);



