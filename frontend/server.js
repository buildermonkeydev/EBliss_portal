/**
 * server.js
 *
 * Custom Next.js server + Proxmox VNC WebSocket proxy
 *
 * Run:
 *   npm run build
 *   npm start
 *
 * package.json:
 *   "start": "node server.js"
 */

require("dotenv").config();

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const WebSocket = require("ws");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PROXMOX_HOST = process.env.PROXMOX_HOST || "151.158.114.130:8006";
const PROXMOX_NODE = process.env.PROXMOX_NODE || "pve";

const [PROXMOX_IP, PORT_STR] = PROXMOX_HOST.split(":");
const PROXMOX_PORT = parseInt(PORT_STR || "8006", 10);

console.log(`Proxmox target: ${PROXMOX_IP}:${PROXMOX_PORT}`);
console.log(`Proxmox node: ${PROXMOX_NODE}`);

// ─────────────────────────────────────────────
// START NEXT SERVER
// ─────────────────────────────────────────────
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const wss = new WebSocket.Server({ noServer: true });

  // ───────────────────────────────────────────
  // WEBSOCKET UPGRADE HANDLER
  // ───────────────────────────────────────────
  server.on("upgrade", (req, socket, head) => {
    const { pathname, query } = parse(req.url, true);

    console.log("WS upgrade:", pathname);

    // Match /vncproxy/<vmid>
    const match = pathname?.match(/^\/vncproxy\/(\d+)$/);
    if (!match) {
      socket.destroy();
      return;
    }

    const vmid = match[1];
    const { port, vncticket, ticket } = query;

    if (!port || !vncticket || !ticket) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    // Required by Proxmox origin validation
    req.headers.origin = `https://${PROXMOX_IP}:${PROXMOX_PORT}`;

    wss.handleUpgrade(req, socket, head, (ws) => {
      proxyVnc(ws, vmid, port, vncticket, ticket);
    });
  });

  server.listen(3000, () => {
    console.log("✅ Server ready at http://localhost:3000");
    console.log("✅ WS proxy at ws://localhost:3000/vncproxy/:vmid");
  });
});

// ─────────────────────────────────────────────
// VNC WEBSOCKET PROXY
// ─────────────────────────────────────────────
function proxyVnc(clientWs, vmid, port, vncticket, ticket) {
  const path =
    `/api2/json/nodes/${PROXMOX_NODE}/qemu/${vmid}/vncwebsocket` +
    `?port=${port}&vncticket=${encodeURIComponent(vncticket)}`;

  const wsUrl = `wss://${PROXMOX_IP}:${PROXMOX_PORT}${path}`;

  console.log(`[VNC] Connecting → ${wsUrl}`);

  // Authentication headers
  const headers = ticket.includes("PVEAPIToken")
    ? { Authorization: ticket }
    : { Cookie: `PVEAuthCookie=${ticket}` };

  const proxmoxWs = new WebSocket(wsUrl, ["binary"], {
    rejectUnauthorized: false,
    headers: {
      ...headers,
      Origin: `https://${PROXMOX_IP}:${PROXMOX_PORT}`,
    },
  });

  // IMPORTANT: binary mode
  clientWs.binaryType = "arraybuffer";
  proxmoxWs.binaryType = "arraybuffer";

  // ───── Keepalive (prevents disconnect) ─────
  const keepAlive = setInterval(() => {
    if (proxmoxWs.readyState === WebSocket.OPEN) {
      proxmoxWs.ping();
    }
  }, 30000);

  // ───── Client → Proxmox ─────
  clientWs.on("message", (data) => {
    if (proxmoxWs.readyState === WebSocket.OPEN) {
      proxmoxWs.send(data, { binary: true });
    }
  });

  // ───── Proxmox → Client ─────
  proxmoxWs.on("message", (data) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: true });
    }
  });

  proxmoxWs.on("open", () => {
    console.log(`[VNC] ✅ Connected (VM ${vmid})`);
  });

  proxmoxWs.on("error", (err) => {
    console.error("[VNC] Proxmox error:", err.message);
    clientWs.close(1011, "Proxmox connection failed");
  });

  proxmoxWs.on("close", (code, reason) => {
    console.log(`[VNC] Closed: ${code} ${reason || ""}`);
    clearInterval(keepAlive);

    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.close(code);
    }
  });

  clientWs.on("close", () => {
    clearInterval(keepAlive);

    if (proxmoxWs.readyState === WebSocket.OPEN) {
      proxmoxWs.close();
    }
  });

  clientWs.on("error", () => {
    proxmoxWs.close();
  });
}