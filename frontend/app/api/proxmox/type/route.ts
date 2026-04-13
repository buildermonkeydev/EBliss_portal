import { NextRequest, NextResponse } from "next/server";

const PROXMOX_HOST = "151.158.114.130:8006";
const NODE = "host02-yta";
const TOKEN_ID = "root@pam!cloud-ui";
const SECRET = "05570620-35d6-4aa8-90d2-9383c66de247";
const AUTH_HEADER = `PVEAPIToken=${TOKEN_ID}=${SECRET}`;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vmid = searchParams.get('vmid');
    
    if (!vmid) {
      return NextResponse.json({ error: 'VMID required' }, { status: 400 });
    }
    
    // Check QEMU first
    const qemuRes = await fetch(`https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/qemu/${vmid}/status/current`, {
      headers: {
        'Authorization': AUTH_HEADER,
      },
    });
    
    if (qemuRes.ok) {
      const data = await qemuRes.json();
      return NextResponse.json({ type: 'qemu', status: data.data?.status });
    }
    
    // Check LXC
    const lxcRes = await fetch(`https://${PROXMOX_HOST}/api2/json/nodes/${NODE}/lxc/${vmid}/status/current`, {
      headers: {
        'Authorization': AUTH_HEADER,
      },
    });
    
    if (lxcRes.ok) {
      const data = await lxcRes.json();
      return NextResponse.json({ type: 'lxc', status: data.data?.status });
    }
    
    return NextResponse.json({ error: 'VM not found' }, { status: 404 });
    
  } catch (error: any) {
    console.error('Error fetching VM type:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}