(function(root){
	function create(props = {}) {
		const {
			name = 'boothId',
			className = 'form-select',
			options = [], // [{ id, name, capacity, hourly_rate }]
			labelText = 'Booth',
			onChange
		} = props;

		const wrap = document.createElement('div');
		wrap.className = 'form-group karaoke-booths';
		wrap.style.display = 'none';

		const label = document.createElement('label');
		label.className = 'form-label';
		label.textContent = labelText;

		const select = document.createElement('select');
		select.name = name;
		select.className = className;
		select.innerHTML = '<option value="">Select a booth</option>';
		if (typeof onChange === 'function') select.addEventListener('change', onChange);

		const loading = document.createElement('div');
		loading.className = 'karaoke-booths-loading';
		loading.style.display = 'none';
		loading.style.alignItems = 'center';
		loading.style.gap = '8px';
		loading.style.color = '#6b7280';
		loading.style.fontSize = '14px';
		loading.style.marginTop = '6px';
		loading.innerHTML = '<span class="gm-spinner" aria-hidden="true"></span><span>Loading booths...</span>';

		function renderOptions(items) {
			select.innerHTML = '<option value="">Select a booth</option>' + (items || []).map(b => {
				const currency = '£';
				const rate = (typeof b.hourly_rate === 'number') ? `${currency}${b.hourly_rate.toFixed(2)}` : `${currency}${b.hourly_rate}`;
				return `<option value="${b.id}">${b.name} — cap ${b.capacity} (${rate}/hour)</option>`;
			}).join('');
		}

		wrap.appendChild(label);
		wrap.appendChild(select);
		wrap.appendChild(loading);

		return { el: wrap, select, loading, renderOptions };
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.BoothSelect = { create };
})(typeof window !== 'undefined' ? window : this);



