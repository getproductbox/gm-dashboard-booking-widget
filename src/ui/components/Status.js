(function(root){
	function create() {
		const status = document.createElement('div');
		status.id = 'widget-status';
		status.className = 'status-container';
		return status;
	}

	function setStatus(container, message, type = '') {
		const status = container.querySelector('#widget-status');
		if (!status) return;
		status.textContent = message || '';
		status.className = 'status-container';
		if (type) status.classList.add(type);
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.Status = { create, setStatus };
})(typeof window !== 'undefined' ? window : this);



