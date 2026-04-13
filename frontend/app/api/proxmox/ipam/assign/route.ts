import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ipId, vmid } = await req.json();
    
    // In production, call Proxmox API to assign IP to VM
    // This would involve updating the VM's network configuration
    
    return NextResponse.json({ 
      success: true, 
      message: `IP ${ipId} assigned to VM ${vmid}` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}