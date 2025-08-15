(function(root){
	function create(props = {}) {
		const {
			name = 'guestCount',
			value = '',
			required = true,
			className = 'form-input',
			min = 1,
			max = 100,
			placeholder = 'e.g. 4',
			labelText = 'Guests *',
			onChange,
			onInput
		} = props;

		const group = document.createElement('div');
		group.className = 'form-group';

		const label = document.createElement('label');
		label.className = 'form-label';
		label.textContent = labelText;

		const input = document.createElement('input');
		input.type = 'number';
		input.name = name;
		input.className = className;
		input.min = String(min);
		input.max = String(max);
		if (placeholder) input.placeholder = placeholder;
		if (required) input.required = true;
		if (value !== undefined && value !== null && value !== '') input.value = value;
		if (typeof onChange === 'function') input.addEventListener('change', onChange);
		if (typeof onInput === 'function') input.addEventListener('input', onInput);

		group.appendChild(label);
		group.appendChild(input);
		return group;
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.GuestField = { create };
})(typeof window !== 'undefined' ? window : this);



