"use client"

import Sidebar from '../../components/Sidebar'
import Topbar from "../../components/Topbar"

import BillingInformation from "../../components/dedicatedServers/BillingInformation"
import ServerInformation from "../../components/dedicatedServers/ServerInformation"
import IPAddresses from "../../components/dedicatedServers/IPAddresses"
import OperatingSystem from "../../components/dedicatedServers/OperatingSystem"
import ServerActions from "../../components/dedicatedServers/ServerActions"

export default function ServerDetails() {

  const server = {
    name: "Server #101",
    cost: "₹12,000 INR",
    billingCycle: "Monthly",
    nextInvoice: "May 10, 2024",
    status: "Active",

    processor: "Intel Xeon E-2288G",
    memory: "32 GB DDR4",
    storage: "1 TB NVMe SSD",
    location: "Mumbai Data Center",

    primaryIP: "103.45.67.20",
    reverseDNS: "server101.example.com",
    additionalIPs: ["192.168.0.10", "192.168.0.11"],

    os: "Ubuntu 22.04 LTS",
    kernel: "5.15.0-60-generic"
  }

  return (
    <div className="flex bg-[#0f172a] min-h-screen text-gray-200">

      <Sidebar />

      <div className="flex-1">

        <Topbar />

        <div className="p-8 space-y-6">

          <h1 className="text-2xl font-semibold">
            Server#101 Details
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            <BillingInformation server={server}/>
            <ServerInformation server={server}/>
          </div>

          <IPAddresses server={server}/>

          <OperatingSystem server={server}/>

          <ServerActions/>

        </div>

      </div>

    </div>
  )
}