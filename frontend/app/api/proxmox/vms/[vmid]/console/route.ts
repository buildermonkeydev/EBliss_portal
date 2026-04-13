import { NextRequest, NextResponse } from "next/server"
import https from 'https'

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

async function proxmoxRequest(url: string, method: string, body?: any) {
  const urlObj = new URL(url)
  
  const headers: Record<string, string> = {
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json',
  }
  
  let requestBody: string | undefined
  if (body !== undefined) {
    requestBody = JSON.stringify(body)
    headers['Content-Length'] = Buffer.byteLength(requestBody).toString()
  }
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: urlObj.pathname,
    method: method,
    headers: headers,
    rejectUnauthorized: false,
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let data = ''
      
      res.on('data', (chunk: any) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const parsedData = data && data.trim() ? JSON.parse(data) : {}
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsedData
          })
        } catch (e) {
          resolve({
            ok: false,
            status: res.statusCode,
            data: data
          })
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('[Proxmox Request Error]', error)
      reject(error)
    })
    
    if (requestBody) {
      req.write(requestBody)
    }
    
    req.end()
  })
}

// For Next.js 15, params is a Promise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vmid: string }> }
) {
  try {
    // Await the params Promise
    const { vmid } = await params
    
    console.log(`[Console API] Creating VNC ticket for VM ${vmid}`)
    
    // First, check if VM exists and is running
    const statusResult: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/status/current`,
      'GET'
    )
    
    if (!statusResult.ok) {
      console.error('[Console API] VM status check failed:', statusResult)
      return NextResponse.json(
        { 
          success: false, 
          error: `VM ${vmid} not found or not accessible` 
        },
        { status: 404 }
      )
    }
    
    const vmStatus = statusResult.data.data?.status
    if (vmStatus !== 'running') {
      return NextResponse.json(
        { 
          success: false, 
          error: `VM is ${vmStatus}. Please start the VM first before accessing console.` 
        },
        { status: 400 }
      )
    }
    
    // Create VNC ticket for the VM
    const result: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/vncproxy`,
      'POST',
      {
        websocket: 1
      }
    )
    
    if (!result.ok) {
      console.error('[Console API] Failed to create VNC ticket:', result)
      return NextResponse.json(
        { 
          success: false, 
          error: result.data?.message || result.data || 'Failed to create console session' 
        },
        { status: result.status || 500 }
      )
    }
    
    const ticketData = result.data.data
    console.log('[Console API] VNC ticket created successfully:', {
      port: ticketData.port,
      vmid: vmid
    })
    
    // Return the VNC connection info
    return NextResponse.json({
      success: true,
      port: ticketData.port,
      ticket: ticketData.ticket,
      vncticket: ticketData.vncticket,
      vmid: vmid
    })
    
  } catch (err: any) {
    console.error('[Console API] Error:', err)
    return NextResponse.json(
      { 
        success: false, 
        error: err.message || 'Failed to get console session' 
      },
      { status: 500 }
    )
  }
}