interface Server {
  os: string
  kernel: string
}

interface Props {
  server?: Server
}

export default function OperatingSystem({ server }: Props) {

  if (!server) return null

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 flex items-center gap-4">
      <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center font-bold">
        U
      </div>

      <div>
        <p className="font-semibold">{server.os}</p>
        <p className="text-sm text-gray-400">Kernel: {server.kernel}</p>
      </div>
    </div>
  )
}