import { NextRequest, NextResponse } from "next/server"
import https from 'https'

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

// Define the response type from proxmoxRequest
interface ProxmoxResponse {
  ok: boolean
  status: number
  data: any
}

async function proxmoxRequest(url: string, method: string, body?: any): Promise<ProxmoxResponse> {
  const urlObj = new URL(url)
  
  const headers: Record<string, string> = {
    'Authorization': AUTH_HEADER,
    'Content-Type': 'application/json',
  }
  
  if (body !== undefined) {
    const requestBody = JSON.stringify(body)
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
    
    req.on('error', reject)
    
    if (body !== undefined) {
      req.write(JSON.stringify(body))
    }
    
    req.end()
  })
}

export async function GET(req: NextRequest) {
  try {
    // Fetch both QEMU VMs and LXC containers
    const [qemuResult, lxcResult] = await Promise.all([
      proxmoxRequest(`https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu`, 'GET'),
      proxmoxRequest(`https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc`, 'GET')
    ])
    
    const allVMs: Array<{
      vmid: number
      name: string
      status: string
      cpu: number
      maxmem: number
      maxdisk: number
      uptime: number
      type: 'qemu' | 'lxc'
    }> = []
    
    // Add QEMU VMs
    if (qemuResult.ok && qemuResult.data && qemuResult.data.data) {
      const qemuVMs = qemuResult.data.data.map((vm: any) => ({
        vmid: vm.vmid,
        name: vm.name || `vm-${vm.vmid}`,
        status: vm.status,
        cpu: vm.cpu || 0,
        maxmem: vm.maxmem || 0,
        maxdisk: vm.maxdisk || 0,
        uptime: vm.uptime || 0,
        type: 'qemu' as const
      }))
      allVMs.push(...qemuVMs)
    }
    
    // Add LXC containers
    if (lxcResult.ok && lxcResult.data && lxcResult.data.data) {
      const lxcContainers = lxcResult.data.data.map((ct: any) => ({
        vmid: ct.vmid,
        name: ct.name || ct.hostname || `ct-${ct.vmid}`,
        status: ct.status,
        cpu: ct.cpu || 0,
        maxmem: ct.maxmem || 0,
        maxdisk: ct.maxdisk || 0,
        uptime: ct.uptime || 0,
        type: 'lxc' as const
      }))
      allVMs.push(...lxcContainers)
    }
    
    // Sort by VMID
    allVMs.sort((a, b) => a.vmid - b.vmid)
    
    const qemuCount = qemuResult.ok && qemuResult.data?.data ? qemuResult.data.data.length : 0
    const lxcCount = lxcResult.ok && lxcResult.data?.data ? lxcResult.data.data.length : 0
    
    // console.log(`Found ${allVMs.length} total VMs/Containers (${qemuCount} QEMU, ${lxcCount} LXC)`)
    
    return NextResponse.json({ success: true, data: allVMs })
    
  } catch (err: any) {
    console.error('Failed to fetch VMs:', err)
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    )
  }
}