export function showStatus(container, message, type) {
  const statusDiv = container.querySelector('#widget-status');
  if (!statusDiv) return;
  statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
}

export function insertAfter(element, html) {
  element.insertAdjacentHTML('afterend', html);
}

// UMD attach for direct browser use without bundler
if (typeof window !== 'undefined') {
  window.GMCore = window.GMCore || {};
  window.GMCore.showStatus = showStatus;
  window.GMCore.insertAfter = insertAfter;
}


