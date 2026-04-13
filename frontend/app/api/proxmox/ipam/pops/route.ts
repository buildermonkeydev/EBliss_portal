import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const mockPOPs = [
      {
        id: "mumbai",
        name: "Mumbai Data Center",
        location: "Mumbai",
        country: "India",
        subnets: [
          {
            id: "subnet1",
            cidr: "103.45.67.0/24",
            version: "IPv4",
            totalIPs: 256,
            usedIPs: 45,
            availableIPs: 200,
            reservedIPs: 11,
            gateway: "103.45.67.1",
            dns1: "8.8.8.8",
            dns2: "8.8.4.4",
          },
          {
            id: "subnet2",
            cidr: "2001:db8::/64",
            version: "IPv6",
            totalIPs: 18446744073709551616,
            usedIPs: 5,
            availableIPs: 18446744073709551611,
            reservedIPs: 0,
          },
        ],
      },
      // Add more POPs...
    ];
    
    return NextResponse.json({ success: true, data: mockPOPs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}