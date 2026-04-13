const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Get the path to noVNC files
const novncPath = path.join(__dirname, 'node_modules', '@novnc', 'novnc');

console.log('Serving noVNC from:', novncPath);

// Serve static files
app.use(express.static(novncPath));

// Serve vnc.html directly
app.get('/', (req, res) => {
  res.sendFile(path.join(novncPath, 'vnc.html'));
});

// WebSocket proxy for VNC connections
wss.on('connection', (ws, req) => {
  console.log('WebSocket connection received');
  
  // Parse the URL to get connection parameters
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetHost = url.searchParams.get('host');
  const targetPort = url.searchParams.get('port');
  const targetPath = url.searchParams.get('path');
  
  console.log(`Proxying to: ${targetHost}:${targetPort}${targetPath ? '/' + targetPath : ''}`);
  
  if (!targetHost || !targetPort) {
    console.log('Missing host or port');
    ws.close();
    return;
  }
  
  // Connect to your WebSocket proxy
  const vncWs = new WebSocket(`ws://${targetHost}:${targetPort}/${targetPath || ''}`);
  
  vncWs.on('open', () => {
    console.log('Connected to VNC proxy');
    // Forward messages both ways
    ws.on('message', (data) => {
      if (vncWs.readyState === WebSocket.OPEN) {
        vncWs.send(data);
      }
    });
    
    vncWs.on('message', (data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  });
  
  vncWs.on('error', (err) => {
    console.error('VNC proxy error:', err);
    ws.close();
  });
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
    vncWs.close();
  });
  
  ws.on('close', () => {
    console.log('WebSocket closed');
    if (vncWs.readyState === WebSocket.OPEN) {
      vncWs.close();
    }
  });
});

const PORT = 6080;
server.listen(PORT, () => {
  console.log(`✅ noVNC server running at http://localhost:${PORT}`);
  console.log(`   Open: http://localhost:${PORT}/vnc.html`);
});