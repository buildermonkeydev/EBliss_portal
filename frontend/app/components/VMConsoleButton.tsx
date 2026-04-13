'use client';

import { useRouter } from 'next/navigation';
import { Terminal, Monitor, XCircle } from 'lucide-react';
import { useState } from 'react';

export default function VMConsoleButton({ vmid }: { vmid: number }) {
  const [error, setError] = useState<string | null>(null);

  const openNoVNC = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      // Get VNC ticket from backend
      const response = await fetch(`http://localhost:3001/vms/${vmid}/vnc-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error('Failed to get VNC token');
      }
      
      const responseData = await response.json();
      const { ticket, port } = responseData.data;
      
      // Create the WebSocket URL for the proxy
      const wsUrl = `ws://localhost:3001/vnc-proxy?vmid=${vmid}&token=${encodeURIComponent(token)}`;
      
      // Create HTML content for the new window
      const novncHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>VM ${vmid} Console - noVNC</title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: #2e2e2e;
              color: #fff;
            }
            #controls {
              background: #3c3c3c;
              padding: 10px;
              border-bottom: 1px solid #555;
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
              align-items: center;
              font-size: 14px;
            }
            .control-group {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .control-group label {
              cursor: pointer;
            }
            select, button {
              padding: 5px 10px;
              background: #2e2e2e;
              color: #fff;
              border: 1px solid #555;
              border-radius: 4px;
              cursor: pointer;
            }
            button:hover {
              background: #4e4e4e;
            }
            #status {
              padding: 5px 10px;
              border-radius: 4px;
              font-weight: bold;
            }
            .status-connected {
              background: #2e7d32;
              color: #fff;
            }
            .status-disconnected {
              background: #c62828;
              color: #fff;
            }
            .status-connecting {
              background: #f57c00;
              color: #fff;
            }
            #canvas-container {
              display: flex;
              justify-content: center;
              align-items: center;
              height: calc(100vh - 70px);
              background: #000;
            }
            canvas {
              box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            .info-text {
              color: #aaa;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div id="controls">
            <div class="control-group">
              <span>🔌 VM ${vmid} Console</span>
            </div>
            <div class="control-group">
              <label>
                <input type="checkbox" id="shared-mode" checked> Shared mode
              </label>
            </div>
            <div class="control-group">
              <label>
                <input type="checkbox" id="view-only"> View only
              </label>
            </div>
            <div class="control-group">
              <label>Scaling mode:</label>
              <select id="scaling-mode">
                <option value="none">None</option>
                <option value="local">Local Scaling</option>
                <option value="remote">Remote Resizing</option>
              </select>
            </div>
            <div class="control-group">
              <label>
                <input type="checkbox" id="clip-to-window"> Clip to window
              </label>
            </div>
            <div class="control-group">
              <button id="send-ctrl-alt-del">Ctrl+Alt+Del</button>
            </div>
            <div class="control-group">
              <button id="disconnect">Disconnect</button>
            </div>
            <div id="status" class="status-connecting">Connecting...</div>
          </div>
          <div id="canvas-container">
            <canvas id="novnc-canvas"></canvas>
          </div>
          
          <script src="https://cdn.jsdelivr.net/npm/@novnc/novnc@1.5.0/lib/rfb.min.js"></script>
          <script>
            let rfb;
            let canvas = document.getElementById('novnc-canvas');
            let container = document.getElementById('canvas-container');
            
            // Connection settings
            const wsUrl = '${wsUrl}';
            const password = '${ticket}';
            
            function updateStatus(text, statusClass) {
              const statusDiv = document.getElementById('status');
              statusDiv.textContent = text;
              statusDiv.className = statusClass;
            }
            
            function connect() {
              updateStatus('Connecting...', 'status-connecting');
              
              rfb = new RFB(canvas, wsUrl, {
                credentials: { password: password },
                shared: document.getElementById('shared-mode').checked,
                view_only: document.getElementById('view-only').checked,
                wsProtocols: ['binary']
              });
              
              rfb.addEventListener('connect', function() {
                updateStatus('Connected', 'status-connected');
                console.log('VNC connected');
                
                // Apply scaling mode
                const scalingMode = document.getElementById('scaling-mode').value;
                if (scalingMode === 'local') {
                  rfb.scaleViewport = true;
                  rfb.resizeSession = false;
                } else if (scalingMode === 'remote') {
                  rfb.scaleViewport = false;
                  rfb.resizeSession = true;
                } else {
                  rfb.scaleViewport = false;
                  rfb.resizeSession = false;
                }
                
                rfb.focusOnClick = true;
                canvas.focus();
              });
              
              rfb.addEventListener('disconnect', function(e) {
                updateStatus('Disconnected: ' + (e.detail.clean ? 'Clean' : 'Dirty'), 'status-disconnected');
                console.log('VNC disconnected', e.detail);
              });
              
              rfb.addEventListener('credentialsrequired', function() {
                console.log('Credentials required, sending password');
                rfb.sendCredentials({ password: password });
              });
              
              rfb.addEventListener('securityfailure', function(e) {
                updateStatus('Authentication Failed', 'status-disconnected');
                console.error('Security failure', e.detail);
              });
            }
            
            function disconnect() {
              if (rfb) {
                rfb.disconnect();
                rfb = null;
              }
              updateStatus('Disconnected', 'status-disconnected');
            }
            
            // Handle shared mode toggle
            document.getElementById('shared-mode').addEventListener('change', function() {
              if (rfb) {
                // Reconnect to apply new setting
                disconnect();
                connect();
              }
            });
            
            // Handle view only mode
            document.getElementById('view-only').addEventListener('change', function() {
              if (rfb) {
                rfb.viewOnly = this.checked;
              }
            });
            
            // Handle scaling mode
            document.getElementById('scaling-mode').addEventListener('change', function() {
              if (rfb) {
                const mode = this.value;
                if (mode === 'local') {
                  rfb.scaleViewport = true;
                  rfb.resizeSession = false;
                } else if (mode === 'remote') {
                  rfb.scaleViewport = false;
                  rfb.resizeSession = true;
                } else {
                  rfb.scaleViewport = false;
                  rfb.resizeSession = false;
                }
              }
            });
            
            // Handle clip to window
            document.getElementById('clip-to-window').addEventListener('change', function() {
              if (canvas) {
                if (this.checked) {
                  canvas.style.maxWidth = '100%';
                  canvas.style.maxHeight = '100%';
                } else {
                  canvas.style.maxWidth = 'none';
                  canvas.style.maxHeight = 'none';
                }
              }
            });
            
            // Handle Ctrl+Alt+Del
            document.getElementById('send-ctrl-alt-del').addEventListener('click', function() {
              if (rfb) {
                rfb.sendCtrlAltDel();
              }
            });
            
            // Handle disconnect button
            document.getElementById('disconnect').addEventListener('click', function() {
              disconnect();
            });
            
            // Handle window resize
            window.addEventListener('resize', function() {
              if (rfb && document.getElementById('scaling-mode').value === 'remote') {
                const rect = container.getBoundingClientRect();
                rfb.resizeSession = true;
              }
            });
            
            // Start connection
            connect();
          </script>
        </body>
        </html>
      `;
      
      // Create a blob and open in new window
      const blob = new Blob([novncHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const newWindow = window.open(url, `vm_${vmid}_console`, 'width=1024,height=768,resizable=yes,scrollbars=no,toolbar=no,menubar=no');
      
      if (!newWindow) {
        setError('Popup blocked! Please allow popups for this site.');
      }
      
      // Clean up the blob URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
    } catch (err: any) {
      console.error('Error opening console:', err);
      setError(err.message || 'Failed to open console');
    }
  };
  
  return (
    <>
      <button
        onClick={openNoVNC}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
      >
        <Monitor className="w-4 h-4" />
        Console
      </button>
      
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-2 hover:text-gray-200">×</button>
        </div>
      )}
    </>
  );
}