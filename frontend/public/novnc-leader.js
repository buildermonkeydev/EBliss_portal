// This file will load noVNC as a global
(function() {
  // Create a script element to load noVNC
  var script = document.createElement('script');
  script.src = '/novnc/rfb.js';
  script.onload = function() {
    // Signal that RFB is ready
    window.__RFB_READY = true;
    if (window.__RFB_CALLBACK) {
      window.__RFB_CALLBACK(window.RFB);
    }
  };
  script.onerror = function() {
    if (window.__RFB_ERROR) {
      window.__RFB_ERROR(new Error('Failed to load noVNC'));
    }
  };
  document.head.appendChild(script);
})();