import { NextRequest, NextResponse } from "next/server";
import https from "https";

const PROXMOX_HOST = "151.158.114.130:8006";
const NODE = "host02-yta";
const TOKEN_ID = "root@pam!cloud-ui";
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247";
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`;

async function proxmoxRequest(url: string, method: string) {
  const urlObj = new URL(url);
  
  const headers: Record<string, string> = {
    Authorization: AUTH_HEADER,
    "Content-Type": "application/json",
  };
  
  const options = {
    hostname: urlObj.hostname,
    port: urlObj.port || 443,
    path: urlObj.pathname,
    method: method,
    headers: headers,
    rejectUnauthorized: false,
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res: any) => {
      let data = "";
      
      res.on("data", (chunk: any) => {
        data += chunk;
      });
      
      res.on("end", () => {
        try {
          const parsedData = data && data.trim() ? JSON.parse(data) : {};
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsedData,
          });
        } catch (e) {
          resolve({
            ok: false,
            status: res.statusCode,
            data: data,
          });
        }
      });
    });
    
    req.on("error", (error) => {
      console.error("Request error:", error);
      resolve({
        ok: false,
        status: 500,
        data: { error: error.message },
      });
    });
    
    req.end();
  });
}

// Function to get VM type (qemu or lxc)
async function getVMType(vmid: string): Promise<"qemu" | "lxc" | null> {
  try {
    // Try QEMU first
    const qemuUrl = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/status/current`;
    const qemuResult: any = await proxmoxRequest(qemuUrl, "GET");
    
    if (qemuResult.ok && qemuResult.data && qemuResult.data.data) {
      return "qemu";
    }
    
    // Try LXC
    const lxcUrl = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc/${vmid}/status/current`;
    const lxcResult: any = await proxmoxRequest(lxcUrl, "GET");
    
    if (lxcResult.ok && lxcResult.data && lxcResult.data.data) {
      return "lxc";
    }
    
    return null;
  } catch (err) {
    console.error("Error detecting VM type:", err);
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vmid: string }> }
) {
  try {
    // Await the params - THIS IS THE KEY FIX
    const { vmid } = await params;
    
    // console.log(`Fetching stats for VM ${vmid}`);
    
    // First, try to detect if it's QEMU or LXC
    const vmType = await getVMType(vmid);
    
    if (!vmType) {
    //   console.log(`VM ${vmid} not found`);
      return NextResponse.json(
        { 
          success: false, 
          data: {
            cpu: 0,
            memory: { used: 0, total: 0, percentage: 0 },
            disk: { used: 0, total: 0, percentage: 0 },
            network: { in: 0, out: 0 },
            uptime: 0,
            status: "not_found"
          }
        },
        { status: 200 }
      );
    }
    
    // Fetch current status based on type
    const statusUrl = `https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/${vmType}/${vmid}/status/current`;
    const statusResult: any = await proxmoxRequest(statusUrl, "GET");
    
    // console.log(`Status result for VM ${vmid}:`, statusResult.status);
    
    if (!statusResult.ok) {
      // If VM is stopped or error, return default stats
      return NextResponse.json(
        { 
          success: true, 
          data: {
            cpu: 0,
            memory: { used: 0, total: 0, percentage: 0 },
            disk: { used: 0, total: 0, percentage: 0 },
            network: { in: 0, out: 0 },
            uptime: 0,
            status: "stopped"
          }
        },
        { status: 200 }
      );
    }
    
    const data = statusResult.data.data;
    
    // Handle different response structures for QEMU vs LXC
    const stats = {
      cpu: (data.cpu || 0) * 100,
      memory: {
        used: data.mem || data.memory || 0,
        total: data.maxmem || data.maxmemory || 0,
        percentage: ((data.mem || data.memory || 0) / (data.maxmem || data.maxmemory || 1)) * 100,
      },
      disk: {
        used: data.disk || data.rootfs?.used || 0,
        total: data.maxdisk || data.rootfs?.total || 0,
        percentage: ((data.disk || data.rootfs?.used || 0) / (data.maxdisk || data.rootfs?.total || 1)) * 100,
      },
      network: {
        in: data.netin || 0,
        out: data.netout || 0,
      },
      uptime: data.uptime || 0,
      status: data.status || "unknown",
      type: vmType,
    };
    
    // Ensure percentages don't exceed 100%
    stats.memory.percentage = Math.min(stats.memory.percentage, 100);
    stats.disk.percentage = Math.min(stats.disk.percentage, 100);
    
    return NextResponse.json({ success: true, data: stats });
    
  } catch (err: any) {
    console.error("Failed to fetch VM stats:", err);
    return NextResponse.json(
      { 
        success: false, 
        data: {
          cpu: 0,
          memory: { used: 0, total: 0, percentage: 0 },
          disk: { used: 0, total: 0, percentage: 0 },
          network: { in: 0, out: 0 },
          uptime: 0,
          status: "error",
          error: err.message
        }
      },
      { status: 200 }
    );
  }
}