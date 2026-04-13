import { NextRequest, NextResponse } from "next/server"
import https from 'https'

const PROXMOX_HOST = "151.158.114.130:8006"
const NODE = "host02-yta"
const TOKEN_ID = "root@pam!cloud-ui"
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247"
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`

// Enhanced Proxmox request with better error handling
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
  
  console.log(`[Proxmox] Making ${method} request to: ${url}`)
  if (requestBody) {
    console.log('[Proxmox] Request body:', requestBody)
  }
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let data = ''
      
      res.on('data', (chunk: any) => {
        data += chunk
      })
      
      res.on('end', () => {
        console.log('[Proxmox] Response status:', res.statusCode)
        
        try {
          const parsedData = data && data.trim() ? JSON.parse(data) : {}
          
          if (parsedData.errors) {
            console.error('[Proxmox] API Errors:', parsedData.errors)
          }
          
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsedData,
            rawData: data
          })
        } catch (e) {
          console.error('[Proxmox] JSON parse error:', e)
          resolve({
            ok: false,
            status: res.statusCode,
            data: data,
            rawData: data
          })
        }
      })
    })
    
    req.on('error', (error) => {
      console.error('[Proxmox] Request error:', error)
      reject(error)
    })
    
    if (requestBody) {
      req.write(requestBody)
    }
    
    req.end()
  })
}

// Get all existing VM IDs (both QEMU and LXC)
async function getAllExistingVMIDs() {
  try {
    const qemuResult: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu`,
      'GET'
    )
    
    const lxcResult: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc`,
      'GET'
    )
    
    const existingIds: number[] = []
    
    if (qemuResult.ok && qemuResult.data.data) {
      qemuResult.data.data.forEach((vm: any) => {
        existingIds.push(vm.vmid)
      })
    }
    
    if (lxcResult.ok && lxcResult.data.data) {
      lxcResult.data.data.forEach((ct: any) => {
        existingIds.push(ct.vmid)
      })
    }
    
    console.log('[Proxmox] Existing VM IDs:', existingIds)
    return existingIds
  } catch (err) {
    console.error('[Proxmox] Failed to get existing VM IDs:', err)
    return []
  }
}

// Get all available templates from all storages
async function getAvailableTemplates() {
  try {
    // First, get all storages
    const storagesResult: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/storage`,
      'GET'
    )
    
    if (!storagesResult.ok || !storagesResult.data.data) {
      console.error('[Proxmox] Failed to get storages')
      return []
    }
    
    const storages = storagesResult.data.data
    const allTemplates: any[] = []
    
    // Check each storage for templates
    for (const storage of storages) {
      const storageName = storage.storage
      
      try {
        const contentResult: any = await proxmoxRequest(
          `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/storage/${storageName}/content`,
          'GET'
        )
        
        if (contentResult.ok && contentResult.data.data) {
          const templates = contentResult.data.data.filter(
            (item: any) => item.content === 'vztmpl' || item.content === 'rootfs'
          )
          
          templates.forEach((template: any) => {
            allTemplates.push({
              name: template.volid,
              storage: storageName,
              size: template.size,
              format: template.format,
              content: template.content
            })
          })
        }
      } catch (err) {
        console.error(`[Proxmox] Failed to get content from storage ${storageName}:`, err)
      }
    }
    
    console.log('[Proxmox] Available templates:', allTemplates.map(t => t.name))
    return allTemplates
  } catch (err) {
    console.error('[Proxmox] Failed to get templates:', err)
    return []
  }
}

// Check if template exists and return the correct format
async function checkTemplateExists(template: string) {
  const templates = await getAvailableTemplates()
  const foundTemplate = templates.find(t => t.name === template)
  
  if (foundTemplate) {
    console.log('[Proxmox] Template found:', foundTemplate)
    return true
  }
  
  console.log('[Proxmox] Template not found:', template)
  return false
}

// Verify node is accessible
async function verifyNodeAccess() {
  try {
    const result: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/status`,
      'GET'
    )
    return result.ok
  } catch (err) {
    console.error('[Proxmox] Node access check failed:', err)
    return false
  }
}

// Verify container was created
async function verifyContainer(vmid: number) {
  try {
    const result: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc/${vmid}/status/current`,
      'GET'
    )
    return result.ok
  } catch (err) {
    console.error('[Proxmox] Container verification failed:', err)
    return false
  }
}

// Main POST handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, cores, memory, disk, template, password, sshKeys } = body
    
    console.log('[API] Deploy request received:', { 
      name, 
      cores, 
      memory, 
      disk, 
      template,
      hasPassword: !!password,
      hasSSHKeys: !!sshKeys 
    })
    
    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Container name is required" },
        { status: 400 }
      )
    }
    
    if (!password) {
      return NextResponse.json(
        { error: "Root password is required" },
        { status: 400 }
      )
    }
    
    if (!template) {
      return NextResponse.json(
        { error: "Template is required" },
        { status: 400 }
      )
    }
    
    // Validate numeric fields
    const coresNum = parseInt(cores) || 1
    const memoryNum = parseInt(memory) || 512
    const diskNum = parseInt(disk) || 10
    
    if (coresNum < 1 || coresNum > 32) {
      return NextResponse.json(
        { error: "Cores must be between 1 and 32" },
        { status: 400 }
      )
    }
    
    if (memoryNum < 128 || memoryNum > 32768) {
      return NextResponse.json(
        { error: "Memory must be between 128MB and 32768MB" },
        { status: 400 }
      )
    }
    
    if (diskNum < 1 || diskNum > 100) {
      return NextResponse.json(
        { error: "Disk must be between 1GB and 100GB" },
        { status: 400 }
      )
    }
    
    // Step 1: Verify node access
    console.log('[API] Step 1: Verifying node access...')
    const nodeAccessible = await verifyNodeAccess()
    if (!nodeAccessible) {
      return NextResponse.json(
        { error: "Cannot access Proxmox node. Please check if the node exists and API token has proper permissions." },
        { status: 503 }
      )
    }
    console.log('[API] Node access verified')
    
    // Step 2: Check if template exists
    console.log('[API] Step 2: Checking template...')
    const templateExists = await checkTemplateExists(template)
    if (!templateExists) {
      // Get available templates for better error message
      const availableTemplates = await getAvailableTemplates()
      const templateList = availableTemplates.map(t => t.name).join(', ')
      
      return NextResponse.json(
        { 
          error: `Template "${template}" not found.`,
          availableTemplates: templateList || 'No templates found',
          suggestion: 'Use one of the available templates listed above'
        },
        { status: 400 }
      )
    }
    console.log('[API] Template verified')
    
    // Step 3: Get existing VM IDs and find next available
    console.log('[API] Step 3: Finding available VM ID...')
    const existingIds = await getAllExistingVMIDs()
    
    let newVmid = 100
    while (existingIds.includes(newVmid)) {
      newVmid++
    }
    
    console.log('[API] Selected VM ID:', newVmid)
    
    // Step 4: Create the LXC container
    console.log('[API] Step 4: Creating container...')
    const createUrl = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc`
    
    // Determine the correct storage for rootfs
    // If template is from 'local' storage, use 'local-lvm' for rootfs (or vice versa)
    let rootfsStorage = 'local-lvm' // default
    if (template.startsWith('local:')) {
      rootfsStorage = 'local-lvm'
    } else if (template.startsWith('local-lvm:')) {
      rootfsStorage = 'local-lvm'
    }
    
    const createBody: Record<string, any> = {
      vmid: newVmid,
      hostname: name,
      cores: coresNum,
      memory: memoryNum,
      swap: memoryNum,
      ostemplate: template,
      password: password,
      rootfs: `${rootfsStorage}:${diskNum}`,
      net0: `name=eth0,bridge=vmbr0,ip=dhcp`,
      onboot: 1,
      start: 1,
      unprivileged: 1,
      ssh_public_keys: sshKeys && sshKeys.trim() ? sshKeys : undefined,
    }
    
    // Remove undefined values
    Object.keys(createBody).forEach(key => {
      if (createBody[key] === undefined) {
        delete createBody[key]
      }
    })
    
    console.log('[API] Create payload:', JSON.stringify(createBody, null, 2))
    
    const createResult: any = await proxmoxRequest(createUrl, 'POST', createBody)
    
    // Handle creation errors
    if (!createResult.ok) {
      let errorMessage = 'Failed to create container'
      let errorDetails = createResult.data
      
      if (createResult.data?.errors) {
        const errors = createResult.data.errors
        if (typeof errors === 'object') {
          errorMessage = Object.values(errors).join(', ')
        } else {
          errorMessage = String(errors)
        }
      } else if (createResult.data?.message) {
        errorMessage = createResult.data.message
      } else if (createResult.rawData) {
        errorMessage = createResult.rawData
      }
      
      console.error('[API] Container creation failed:', {
        status: createResult.status,
        error: errorMessage,
        details: errorDetails
      })
      
      if (createResult.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. API token lacks required permissions for container creation.' },
          { status: 403 }
        )
      } else if (createResult.status === 404) {
        return NextResponse.json(
          { error: 'Template, storage, or network bridge not found. Please verify all resources exist.' },
          { status: 404 }
        )
      } else if (createResult.status === 500) {
        return NextResponse.json(
          { error: 'Proxmox internal error. Check Proxmox logs for details.', details: errorMessage },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorDetails },
        { status: createResult.status || 500 }
      )
    }
    
    console.log('[API] Container created successfully, response:', createResult.data)
    
    // Step 5: Verify container was actually created
    console.log('[API] Step 5: Verifying container...')
    const containerExists = await verifyContainer(newVmid)
    
    if (!containerExists) {
      console.warn('[API] Container creation reported success but verification failed')
      return NextResponse.json({ 
        success: true, 
        data: { vmid: newVmid, name: name },
        message: 'Container creation initiated but status check failed. Please verify manually in Proxmox interface.',
        warning: true
      })
    }
    
    console.log('[API] Container verified successfully')
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        vmid: newVmid, 
        name: name,
        cores: coresNum,
        memory: memoryNum,
        disk: diskNum,
        template: template
      },
      message: `Container ${name} (ID: ${newVmid}) created and started successfully`
    })
    
  } catch (err: any) {
    console.error('[API] Unexpected error in deploy handler:', err)
    
    const errorMessage = err.message || 'Failed to deploy container'
    const errorStack = process.env.NODE_ENV === 'development' ? err.stack : undefined
    
    return NextResponse.json(
      { 
        error: errorMessage,
        ...(errorStack && { stack: errorStack })
      },
      { status: 500 }
    )
  }
}

// GET handler to check available templates and containers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    
    if (action === 'templates') {
      const templates = await getAvailableTemplates()
      const lxcTemplates = templates.filter(t => t.content === 'vztmpl')
      
      return NextResponse.json({ 
        templates: lxcTemplates,
        count: lxcTemplates.length,
        message: lxcTemplates.length === 0 ? 'No LXC templates found. Please upload a template first.' : null
      })
    }
    
    if (action === 'storages') {
      const storagesResult: any = await proxmoxRequest(
        `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/storage`,
        'GET'
      )
      
      if (storagesResult.ok) {
        return NextResponse.json({ storages: storagesResult.data.data })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch storages' },
        { status: storagesResult.status || 500 }
      )
    }
    
    if (action === 'status') {
      const nodeStatus: any = await proxmoxRequest(
        `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/status`,
        'GET'
      )
      
      if (nodeStatus.ok) {
        return NextResponse.json({ status: nodeStatus.data })
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch node status' },
        { status: nodeStatus.status || 500 }
      )
    }
    
    // Default: list all containers
    const containers: any = await proxmoxRequest(
      `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc`,
      'GET'
    )
    
    if (containers.ok) {
      return NextResponse.json({ containers: containers.data.data })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch containers' },
      { status: containers.status || 500 }
    )
    
  } catch (err: any) {
    console.error('[API] Error in GET handler:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch data' },
      { status: 500 }
    )
  }
}