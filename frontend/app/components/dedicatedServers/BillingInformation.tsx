"use client"

import { FaMoneyBillWave, FaCalendarAlt, FaFileInvoiceDollar, FaCheckCircle } from "react-icons/fa"

interface Props {
  server: any
}

export default function BillingInformation({ server }: Props) {

  return (
    <div className="bg-[#0f172a] p-6 rounded-xl border border-slate-700 shadow-lg hover:shadow-xl transition-all duration-300">

      {/* Header */}
      <h2 className="text-xl font-semibold mb-5 text-white flex items-center gap-2">
        <FaFileInvoiceDollar className="text-indigo-400" />
        Billing Information
      </h2>

      {/* Billing Details */}
      <div className="space-y-4 text-sm text-gray-300">

        {/* Monthly Cost */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaMoneyBillWave className="text-green-400" />
            <span>Monthly Cost</span>
          </div>

          <span className="font-semibold text-white">
            {server.cost}
          </span>
        </div>

        {/* Billing Cycle */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-yellow-400" />
            <span>Billing Cycle</span>
          </div>

          <span className="text-gray-200">
            {server.billingCycle}
          </span>
        </div>

        {/* Next Invoice */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaFileInvoiceDollar className="text-blue-400" />
            <span>Next Invoice</span>
          </div>

          <span className="text-gray-200">
            {server.nextInvoice}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between bg-slate-900 p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="text-green-400" />
            <span>Status</span>
          </div>

          <span className="px-3 py-1 bg-green-600/20 text-green-400 border border-green-500 rounded-full text-xs font-medium">
            {server.status}
          </span>
        </div>

      </div>

    </div>
  )
}