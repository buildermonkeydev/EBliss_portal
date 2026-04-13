import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Mock data - replace with actual Proxmox API calls
    const mockIPs = [
      {
        id: "1",
        address: "103.45.67.20",
        version: "IPv4",
        subnet: "103.45.67.0/24",
        pop: "mumbai",
        status: "assigned",
        assignedTo: { vmid: 102, name: "operation", type: "vm" },
        ptrRecord: "server1.ebliss.com",
        createdAt: "2024-01-15T10:00:00Z",
        assignedAt: "2024-01-15T10:30:00Z",
      },
      {
        id: "2",
        address: "103.45.67.21",
        version: "IPv4",
        subnet: "103.45.67.0/24",
        pop: "mumbai",
        status: "available",
        createdAt: "2024-01-15T10:00:00Z",
      },
      // Add more IPs...
    ];
    
    return NextResponse.json({ success: true, data: mockIPs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}