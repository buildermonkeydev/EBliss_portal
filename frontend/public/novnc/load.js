// This script loads noVNC and exposes it to window
(function() {
  console.log('Loading noVNC wrapper...');
  
  // Create a script element to load the actual noVNC
  var script = document.createElement('script');
  script.src = '/novnc/rfb.js';
  script.onload = function() {
    console.log('noVNC script loaded, checking for RFB...');
    
    // noVNC uses CommonJS, so we need to check if it's available
    // The script might have attached something to window
    if (typeof window.RFB !== 'undefined') {
      console.log('RFB found on window!');
      window.dispatchEvent(new Event('novnc-ready'));
      return;
    }
    
    // Try to get it from the module
    // Sometimes it's available via require
    if (typeof require !== 'undefined') {
      try {
        var RFB = require('/novnc/rfb.js');
        if (RFB) {
          window.RFB = RFB;
          console.log('RFB exposed via require');
          window.dispatchEvent(new Event('novnc-ready'));
          return;
        }
      } catch(e) {
        console.log('Require failed:', e);
      }
    }
    
    // Last resort: check if it's a global
    setTimeout(function() {
      if (typeof window.RFB !== 'undefined') {
        console.log('RFB found after delay');
        window.dispatchEvent(new Event('novnc-ready'));
      } else {
        console.error('RFB still not found');
      }
    }, 500);
  };
  script.onerror = function() {
    console.error('Failed to load noVNC script');
    window.dispatchEvent(new Event('novnc-error'));
  };
  document.head.appendChild(script);
})();