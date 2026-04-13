import { NextRequest } from 'next/server'
// import WebSocket from 'ws'

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

export async function GET(req: NextRequest) {
  // Get query parameters
  const searchParams = req.nextUrl.searchParams
  const vmid = searchParams.get('vmid')
  const port = searchParams.get('port')
  const vncticket = searchParams.get('vncticket')
  const ticket = searchParams.get('ticket')
  
  console.log(`[VNC Proxy] Connection request for VM ${vmid}`)
  
  if (!vmid || !port || !vncticket) {
    return new Response('Missing parameters', { status: 400 })
  }
  
  // Create WebSocket connection to Proxmox
  const proxmoxWsUrl = `wss://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/vncwebsocket?port=${port}&vncticket=${encodeURIComponent(vncticket)}`
  
  console.log(`[VNC Proxy] Connecting to Proxmox: ${proxmoxWsUrl}`)
  
  // This is a WebSocket upgrade request
  // We need to handle it differently in Next.js
  return new Response('WebSocket upgrade required', { 
    status: 426,
    statusText: 'Upgrade Required'
  })
}