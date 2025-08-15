(function(root){
	function createStore(initialState) {
		let state = { ...initialState };
		const subscribers = new Set();

		function get() {
			return state;
		}

		function set(updates, action = 'update') {
			const prev = state;
			state = { ...state, ...updates };
			subscribers.forEach(fn => {
				try { fn(state, prev, action); } catch (_) {}
			});
			return state;
		}

		function subscribe(listener) {
			subscribers.add(listener);
			return () => subscribers.delete(listener);
		}

		return { get, set, subscribe };
	}

	root.GMStore = { createStore };
})(typeof window !== 'undefined' ? window : this);



