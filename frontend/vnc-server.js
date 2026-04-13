const express = require('express');
const app = express();
const port = 6080;

const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>VM Console</title>
    <meta charset="utf-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; overflow: hidden; }
        #container { width: 100vw; height: 100vh; }
        #status {
            position: fixed;
            bottom: 20px;
            left: 20px;
            color: #22c55e;
            background: rgba(0,0,0,0.85);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-family: monospace;
            z-index: 1000;
        }
        #controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.85);
            padding: 8px 12px;
            border-radius: 8px;
            z-index: 1000;
            display: flex;
            gap: 10px;
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
        }
        button:hover { background: #2563eb; }
        button:disabled { background: #4b5563; cursor: not-allowed; }
        .error { color: #ef4444 !important; }
    </style>
</head>
<body>
    <div id="container"></div>
    <div id="status">Initializing...</div>
    <div id="controls">
        <button id="ctrlAltDel" disabled>Ctrl+Alt+Del</button>
        <button id="fullscreen">Fullscreen</button>
    </div>

    <script>
        // Use the browser version from a working CDN
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@novnc/novnc@1.4.0/lib/rfb.js';
        script.onload = function() {
            console.log('noVNC loaded');
            initVNC();
        };
        script.onerror = function() {
            document.getElementById('status').textContent = 'Failed to load noVNC';
            document.getElementById('status').style.color = '#ef4444';
        };
        document.head.appendChild(script);
        
        function initVNC() {
            const urlParams = new URLSearchParams(window.location.search);
            const host = urlParams.get('host') || window.location.hostname;
            const port = urlParams.get('port') || '3000';
            let path = urlParams.get('path') || '';
            const password = urlParams.get('password') || '';
            
            if (path.startsWith('/')) path = path.substring(1);
            
            const statusDiv = document.getElementById('status');
            let rfb = null;
            let connected = false;
            
            function updateStatus(text, isError = false) {
                statusDiv.textContent = text;
                statusDiv.style.color = isError ? '#ef4444' : '#22c55e';
                console.log('[VNC]', text);
            }
            
            function startConnection() {
                try {
                    updateStatus('Connecting...');
                    
                    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    const wsUrl = wsProtocol + '//' + host + ':' + port + '/' + path;
                    
                    console.log('WebSocket URL:', wsUrl);
                    
                    rfb = new RFB(document.getElementById('container'), wsUrl);
                    rfb.scaleViewport = true;
                    rfb.resizeSession = true;
                    
                    rfb.addEventListener('connect', function() {
                        connected = true;
                        updateStatus('Connected');
                        document.getElementById('ctrlAltDel').disabled = false;
                    });
                    
                    rfb.addEventListener('disconnect', function(e) {
                        connected = false;
                        updateStatus('Disconnected: ' + (e.detail?.reason || 'Session ended'), true);
                        document.getElementById('ctrlAltDel').disabled = true;
                    });
                    
                    rfb.addEventListener('credentialsrequired', function() {
                        if (password && rfb) {
                            rfb.sendCredentials({ password: password });
                        }
                    });
                    
                } catch (err) {
                    updateStatus('Error: ' + err.message, true);
                    console.error(err);
                }
            }
            
            function waitForRFB() {
                if (typeof RFB !== 'undefined') {
                    startConnection();
                } else {
                    setTimeout(waitForRFB, 100);
                }
            }
            
            waitForRFB();
            
            document.getElementById('ctrlAltDel').onclick = function() {
                if (rfb && connected) {
                    rfb.sendCtrlAltDel();
                    updateStatus('Ctrl+Alt+Del sent');
                    setTimeout(function() { updateStatus('Connected'); }, 1000);
                }
            };
            
            document.getElementById('fullscreen').onclick = function() {
                if (document.documentElement.requestFullscreen) {
                    document.documentElement.requestFullscreen();
                }
            };
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => {
    res.send(htmlContent);
});

app.get('/vnc.html', (req, res) => {
    res.send(htmlContent);
});

app.listen(port, () => {
    console.log(` noVNC server running at http://localhost:${port}`);
    console.log(`   Open: http://localhost:${port}/vnc.html`);
});