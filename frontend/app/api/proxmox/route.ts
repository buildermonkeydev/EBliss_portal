import { NextRequest, NextResponse } from "next/server"

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, vmid, type = 'qemu' } = body

    // console.log('Received action:', action, 'for VMID:', vmid, 'type:', type)

    if (!["start", "stop", "reboot", "destroy"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    if (!vmid) {
      return NextResponse.json({ error: "VMID is required" }, { status: 400 })
    }

    // Choose endpoint based on type (qemu or lxc)
    const endpoint = type === 'lxc' ? 'lxc' : 'qemu'
    
    let url: string
    let method: string
    let requestBody: string | undefined

    if (action === "destroy") {
      url = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/${endpoint}/${vmid}`
      method = "DELETE"
      requestBody = undefined
    } else {
      url = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/${endpoint}/${vmid}/status/${action}`
      method = "POST"
      // Empty JSON object for status actions
      requestBody = JSON.stringify({})
    }

    // console.log('URL:', url)
    // console.log('Method:', method)
    // console.log('Request body:', requestBody)

    const https = require('https')
    const urlObj = new URL(url)
    
    // Prepare headers with Content-Length to avoid chunked encoding
    const headers: Record<string, string | number> = {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
    }
    
    // Add Content-Length header to prevent chunked encoding
    if (requestBody) {
      headers['Content-Length'] = Buffer.byteLength(requestBody)
    } else {
      headers['Content-Length'] = 0
    }
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: headers,
      rejectUnauthorized: false,
    }

    // console.log('Request options:', {
    //   ...options,
    //   headers: { ...options.headers, Authorization: '***' }
    // })

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let data = ''
        
        res.on('data', (chunk: any) => {
          data += chunk
        })
        
        res.on('end', () => {
          // console.log('Response status:', res.statusCode)
          // console.log('Response data:', data)
          
          try {
            const parsedData = data && data.trim() ? JSON.parse(data) : {}
            resolve({
              status: res.statusCode,
              data: parsedData,
              headers: res.headers
            })
          } catch (e) {
            console.error('Failed to parse response:', e)
            resolve({
              status: res.statusCode,
              data: data,
              headers: res.headers
            })
          }
        })
      })
      
      req.on('error', (error: any) => {
        console.error('Request error:', error)
        reject(error)
      })
      
      // Write the request body if it exists
      if (requestBody) {
        req.write(requestBody)
      }
      
      req.end()
    })

    const result: any = response

    if (result.status >= 200 && result.status < 300) {
      return NextResponse.json({ 
        success: true, 
        data: result.data 
      })
    } else {
      return NextResponse.json(
        { 
          error: result.data?.error || result.data?.message || `Proxmox error ${result.status}`,
          details: result.data
        },
        { status: result.status }
      )
    }
    
  } catch (err: any) {
    console.error('Proxy error details:', err)
    return NextResponse.json(
      { 
        error: err.message || "Request failed",
        details: err.toString(),
        stack: err.stack
      }, 
      { status: 500 }
    )
  }
}

// For console ticket - supports both QEMU and LXC
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const vmid = searchParams.get('vmid')
    const type = searchParams.get('type') || 'qemu'
    
    if (!vmid) {
      return NextResponse.json(
        { error: "VMID is required" },
        { status: 400 }
      )
    }
    
    // Choose endpoint based on type
    const endpoint = type === 'lxc' ? 'lxc' : 'qemu'
    const url = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/${endpoint}/${vmid}/vncproxy`
    
    const https = require('https')
    const urlObj = new URL(url)
    
    const requestBody = JSON.stringify({ websocket: 1 })
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "POST",
      headers: {
        'Authorization': AUTH_HEADER,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
      rejectUnauthorized: false,
    }

    // console.log(`Requesting VNC proxy for ${type} VM:`, vmid)

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let data = ''
        
        res.on('data', (chunk: any) => {
          data += chunk
        })
        
        res.on('end', () => {
          // console.log('VNC response status:', res.statusCode)
          // console.log('VNC response data:', data)
          
          try {
            const parsedData = data && data.trim() ? JSON.parse(data) : {}
            resolve({
              status: res.statusCode,
              data: parsedData
            })
          } catch (e) {
            console.error('Failed to parse VNC response:', e)
            resolve({
              status: res.statusCode,
              data: data
            })
          }
        })
      })
      
      req.on('error', (error: any) => {
        console.error('VNC request error:', error)
        reject(error)
      })
      
      req.write(requestBody)
      req.end()
    })

    const result: any = response

    if (result.status === 200 && result.data?.data) {
      return NextResponse.json({
        ticket: result.data.data.ticket,
        port: result.data.data.port,
        host: PROXMOX_HOST,
        node: NODE,
        vmid: vmid,
        type: type
      })
    } else {
      return NextResponse.json(
        { 
          error: result.data?.error || result.data?.message || "Failed to get ticket",
          details: result.data 
        },
        { status: result.status || 500 }
      )
    }
  } catch (err: any) {
    console.error('VNC proxy error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}