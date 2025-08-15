(function(root){
	function create(props = {}) {
		const {
			text = 'Hold active. Expires in',
			countdownSelector = '.hold-countdown',
			cancelText = 'Cancel',
			onCancel
		} = props;

		const wrap = document.createElement('div');
		wrap.className = 'form-group karaoke-hold';
		wrap.style.display = 'none';
		wrap.style.color = '#111827';

		wrap.innerHTML = `
			<div class="hold-status" style="display:flex; align-items:center; justify-content:space-between;">
				<span class="hold-text">${text} <span class="hold-countdown">10:00</span>.</span>
				<button type="button" class="hold-cancel" style="background:#ef4444; color:white; border:none; padding:8px 12px; border-radius:6px; cursor:pointer;">${cancelText}</button>
			</div>
		`;

		const cancelBtn = wrap.querySelector('.hold-cancel');
		if (typeof onCancel === 'function') cancelBtn.addEventListener('click', onCancel);

		return { el: wrap, cancelBtn };
	}

	root.GMUI = root.GMUI || {};
	root.GMUI.HoldBanner = { create };
})(typeof window !== 'undefined' ? window : this);



