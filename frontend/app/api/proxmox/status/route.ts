import { NextRequest, NextResponse } from "next/server"
import https from 'https'

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

export async function GET(req: NextRequest) {
  try {
    // Get VMID from query parameters
    const searchParams = req.nextUrl.searchParams
    const vmid = searchParams.get('vmid')
    
    // Validate VMID
    if (!vmid) {
      return NextResponse.json(
        { error: "VMID is required" },
        { status: 400 }
      )
    }
    
    // Validate that VMID is a number
    const vmidNum = parseInt(vmid)
    if (isNaN(vmidNum)) {
      return NextResponse.json(
        { error: "Invalid VMID format. Must be a number." },
        { status: 400 }
      )
    }
    
    const url = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/status/current`
    
    const https = require('https')
    const urlObj = new URL(url)
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: "GET",
      headers: {
        'Authorization': AUTH_HEADER,
      },
      rejectUnauthorized: false,
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res: any) => {
        let data = ''
        
        res.on('data', (chunk: any) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const parsedData = data && data.trim() ? JSON.parse(data) : {}
            resolve({
              status: res.statusCode,
              data: parsedData
            })
          } catch (e) {
            resolve({
              status: res.statusCode,
              data: data
            })
          }
        })
      })
      
      req.on('error', reject)
      req.end()
    })

    const result: any = response

    if (result.status === 200 && result.data?.data) {
      return NextResponse.json({ 
        success: true, 
        data: result.data.data 
      })
    } else {
      return NextResponse.json(
        { 
          error: result.data?.error || "Failed to get VM status",
          details: result.data 
        },
        { status: result.status || 500 }
      )
    }
  } catch (err: any) {
    console.error('Status fetch error:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}