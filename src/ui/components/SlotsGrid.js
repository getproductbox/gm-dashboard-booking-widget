(function(root){
	function create(props = {}) {
		const {
			className = 'karaoke-slots',
			groupClass = 'karaoke-slots-group',
			loadingClass = 'karaoke-slots-loading',
			emptyClass = 'karaoke-empty',
			slots = [],
			onSlotClick
		} = props;

		const group = document.createElement('div');
		group.className = `form-group ${groupClass}`;

		const label = document.createElement('label');
		label.className = 'form-label';
		label.textContent = 'Select a Time Slot';

		const grid = document.createElement('div');
		grid.className = className;
		grid.style.display = 'grid';
		grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(140px, 1fr))';
		grid.style.gap = '8px';

		const loading = document.createElement('div');
		loading.className = loadingClass;
		loading.style.display = 'none';
		loading.style.alignItems = 'center';
		loading.style.gap = '8px';
		loading.style.color = '#6b7280';
		loading.style.fontSize = '14px';
		loading.style.marginTop = '6px';
		loading.innerHTML = '<span class="gm-spinner" aria-hidden="true"></span><span>Loading slots...</span>';

		const empty = document.createElement('div');
		empty.className = emptyClass;
		empty.style.display = 'none';
		empty.style.color = '#6b7280';
		empty.style.fontSize = '14px';
		empty.style.marginTop = '8px';
		empty.textContent = 'No slots available for your party size on this date.';

		function renderSlots(items) {
			grid.innerHTML = '';
			const available = (items || []).filter(s => s.available);
			if (available.length === 0) {
				empty.style.display = 'block';
				return;
			}
			empty.style.display = 'none';
			available.forEach(slot => {
				const btn = document.createElement('button');
				btn.type = 'button';
				btn.className = 'karaoke-slot-btn';
				const chips = Array.isArray(slot.capacities) && slot.capacities.length
					? `<div class="cap-chips">${slot.capacities.map(c => `<span class=\"cap-chip\">${c}</span>`).join('')}</div>`
					: '';
				btn.innerHTML = `<div class=\"slot-line\">${slot.startTime} – ${slot.endTime}</div>${chips}`;
				btn.dataset.startTime = slot.startTime;
				btn.dataset.endTime = slot.endTime;
				if (typeof onSlotClick === 'function') {
					btn.addEventListener('click', (e) => onSlotClick(e, slot));
				}
				grid.appendChild(btn);
			});
		}

		// initial render
		renderSlots(slots);

		group.appendChild(label);
		group.appendChild(grid);
		group.appendChild(loading);
		group.appendChild(empty);

		return { el: group, renderSlots, grid, loading, empty };
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.SlotsGrid = { create };
})(typeof window !== 'undefined' ? window : this);



