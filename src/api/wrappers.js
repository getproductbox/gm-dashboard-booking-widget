(function(root){
	async function apiFetchKaraokeVenueSlots(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.fetchKaraokeVenueSlots === 'function') {
			return root.GMKaraokeAPI.fetchKaraokeVenueSlots(config, params);
		}
		throw new Error('GMKaraokeAPI.fetchKaraokeVenueSlots not available');
	}

	async function apiFetchKaraokeBoothsForSlot(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.fetchKaraokeBoothsForSlot === 'function') {
			return root.GMKaraokeAPI.fetchKaraokeBoothsForSlot(config, params);
		}
		throw new Error('GMKaraokeAPI.fetchKaraokeBoothsForSlot not available');
	}

	async function apiKaraokeCreateHold(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.karaokeCreateHold === 'function') {
			return root.GMKaraokeAPI.karaokeCreateHold(config, params);
		}
		throw new Error('GMKaraokeAPI.karaokeCreateHold not available');
	}

	async function apiKaraokeReleaseHold(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.karaokeReleaseHold === 'function') {
			return root.GMKaraokeAPI.karaokeReleaseHold(config, params);
		}
		throw new Error('GMKaraokeAPI.karaokeReleaseHold not available');
	}

	async function apiKaraokeExtendHold(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.karaokeExtendHold === 'function') {
			return root.GMKaraokeAPI.karaokeExtendHold(config, params);
		}
		throw new Error('GMKaraokeAPI.karaokeExtendHold not available');
	}

	async function apiKaraokeFinalizeBooking(config, params) {
		if (root.GMKaraokeAPI && typeof root.GMKaraokeAPI.karaokeFinalizeBooking === 'function') {
			return root.GMKaraokeAPI.karaokeFinalizeBooking(config, params);
		}
		throw new Error('GMKaraokeAPI.karaokeFinalizeBooking not available');
	}

	root.apiFetchKaraokeVenueSlots = apiFetchKaraokeVenueSlots;
	root.apiFetchKaraokeBoothsForSlot = apiFetchKaraokeBoothsForSlot;
	root.apiKaraokeCreateHold = apiKaraokeCreateHold;
	root.apiKaraokeReleaseHold = apiKaraokeReleaseHold;
	root.apiKaraokeExtendHold = apiKaraokeExtendHold;
	root.apiKaraokeFinalizeBooking = apiKaraokeFinalizeBooking;
})(typeof window !== 'undefined' ? window : this);


