(function(root){
  function showStatus(container, message, type) {
    const statusDiv = container.querySelector('#widget-status');
    if (!statusDiv) return;
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
  }

  function insertAfter(element, html) {
    element.insertAdjacentHTML('afterend', html);
  }

  root.GMCore = root.GMCore || {};
  root.GMCore.showStatus = showStatus;
  root.GMCore.insertAfter = insertAfter;
})(typeof window !== 'undefined' ? window : this);


