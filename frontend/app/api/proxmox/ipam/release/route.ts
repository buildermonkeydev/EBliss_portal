import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { ipId } = await req.json();
    
    // In production, call Proxmox API to release IP back to pool
    // IP goes into hold period before being available again
    
    return NextResponse.json({ 
      success: true, 
      message: `IP ${ipId} released and will be available after hold period` 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}