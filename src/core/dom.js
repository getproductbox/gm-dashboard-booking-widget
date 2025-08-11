export function showStatus(container, message, type) {
  const statusDiv = container.querySelector('#widget-status');
  if (!statusDiv) return;
  statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
}

export function insertAfter(element, html) {
  element.insertAdjacentHTML('afterend', html);
}


