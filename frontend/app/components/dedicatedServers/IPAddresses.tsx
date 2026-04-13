"use client"

import { FaNetworkWired, FaGlobe, FaExchangeAlt, FaPlusCircle } from "react-icons/fa"

interface Props {
  server: any
}

export default function IPAddresses({ server }: Props) {

  return (
    <div className="bg-[#0f172a] p-6 rounded-xl border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">

      {/* Header */}
      <h2 className="text-xl font-semibold mb-5 text-white flex items-center gap-2">
        <FaNetworkWired className="text-indigo-400" />
        IP Addresses
      </h2>

      <div className="space-y-4 text-sm text-gray-300">

        {/* Primary IP */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaGlobe className="text-blue-400" />
            <span>Primary IP</span>
          </div>

          <span className="font-medium text-blue-400">
            {server.primaryIP}
          </span>
        </div>

        {/* Reverse DNS */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaExchangeAlt className="text-yellow-400" />
            <span>Reverse DNS</span>
          </div>

          <span className="text-gray-200">
            {server.reverseDNS}
          </span>
        </div>

        {/* Additional IPs */}
        <div className="bg-slate-900 p-3 rounded-lg">

          <div className="flex items-center gap-2 mb-2">
            <FaPlusCircle className="text-green-400" />
            <span>Additional IPs</span>
          </div>

          <ul className="space-y-1 text-gray-300 ml-6 list-disc">
            {server.additionalIPs.map((ip: string) => (
              <li key={ip} className="text-blue-400">
                {ip}
              </li>
            ))}
          </ul>

        </div>

      </div>

    </div>
  )
}