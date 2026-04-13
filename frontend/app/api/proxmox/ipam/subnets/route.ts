import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const mockSubnets = [
      {
        id: "subnet1",
        cidr: "103.45.67.0/24",
        version: "IPv4",
        pop: "Mumbai Data Center",
        totalIPs: 256,
        usedIPs: 45,
        availableIPs: 200,
        reservedIPs: 11,
        gateway: "103.45.67.1",
        dns1: "8.8.8.8",
        dns2: "8.8.4.4",
      },
      // Add more subnets...
    ];
    
    return NextResponse.json({ success: true, data: mockSubnets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}