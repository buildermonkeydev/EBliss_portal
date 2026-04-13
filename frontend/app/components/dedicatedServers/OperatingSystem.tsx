interface Props {
  server: any
}

export default function IPAddresses({ server }: Props) {

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">

      <h2 className="text-lg font-semibold mb-4">
        IP Addresses
      </h2>

      <div className="space-y-3 text-sm">

        <p>
          Primary IP:
          <span className="ml-2 text-blue-400">
            {server.primaryIP}
          </span>
        </p>

        <p>
          Reverse DNS:
          <span className="ml-2">
            {server.reverseDNS}
          </span>
        </p>

        <div>

          <p>Additional IPs:</p>

          <ul className="list-disc ml-6 mt-2 space-y-1">
            {server.additionalIPs.map((ip: string) => (
              <li key={ip}>{ip}</li>
            ))}
          </ul>

        </div>

      </div>

    </div>
  )
}