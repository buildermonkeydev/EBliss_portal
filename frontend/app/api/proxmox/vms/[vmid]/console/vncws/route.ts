/**
 * WebSocket proxy for Proxmox noVNC.
 *
 * Browser  ──WS──►  /api/proxmox/vms/[vmid]/vncws  ──WS──►  Proxmox
 *
 * Query params expected from the client:
 *   ?port=XXXX&vncticket=XXXX&ticket=XXXX
 *
 * This route must run in Node.js runtime (not Edge) because it uses `net`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import * as https from "https";
import * as net from "net";
import * as tls from "tls";

const PROXMOX_HOST = process.env.PROXMOX_HOST || "151.158.114.130:8006";
const PROXMOX_NODE = process.env.PROXMOX_NODE || "pve";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vmid: string }> }
) {
  const { vmid } = await params;
  const { searchParams } = new URL(request.url);

  const port = searchParams.get("port");
  const vncticket = searchParams.get("vncticket");
  const ticket = searchParams.get("ticket");

  if (!port || !vncticket || !ticket) {
    return new Response("Missing port, vncticket, or ticket query params", {
      status: 400,
    });
  }

  // Build the Proxmox vncwebsocket URL
  const proxmoxHost = PROXMOX_HOST.split(":")[0];
  const proxmoxPort = parseInt(PROXMOX_HOST.split(":")[1] || "8006", 10);
  const wsPath = `/api2/json/nodes/${PROXMOX_NODE}/qemu/${vmid}/vncwebsocket?port=${port}&vncticket=${encodeURIComponent(vncticket)}`;

  // Next.js App Router doesn't natively support WS upgrades yet,
  // so we use a raw TCP/TLS tunnel approach via the response.
  // For proper WS proxying, use the custom server approach below.
  // This endpoint acts as a health-check / info endpoint.
  // The actual tunneling is done in server.js (see Step 3).

  return new Response(
    JSON.stringify({
      wsUrl: `wss://${proxmoxHost}:${proxmoxPort}${wsPath}`,
      cookie: `PVEAuthCookie=${ticket}`,
      note: "Connect your noVNC client to the /vncproxy WebSocket endpoint on this server",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
}