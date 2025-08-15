(function(root){
	function create(props = {}) {
		const {
			name = 'bookingDate',
			value = '',
			required = true,
			className = 'form-input',
			placeholder = 'Select Date',
			autofocus = false,
			labelText = 'Booking Date *',
			onChange
		} = props;

		const group = document.createElement('div');
		group.className = 'form-group';

		const label = document.createElement('label');
		label.className = 'form-label';
		label.textContent = labelText;

		const input = document.createElement('input');
		input.type = 'date';
		input.name = name;
		input.className = className;
		if (placeholder) input.placeholder = placeholder;
		if (required) input.required = true;
		if (value) input.value = value;
		if (autofocus) input.autofocus = true;
		if (typeof onChange === 'function') input.addEventListener('change', onChange);

		group.appendChild(label);
		group.appendChild(input);
		return group;
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.DateField = { create };
})(typeof window !== 'undefined' ? window : this);



