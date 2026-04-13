interface Props {
  server: any
}

export default function ServerInformation({ server }: Props) {

  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">

      <h2 className="text-lg font-semibold mb-4">
        Server Information
      </h2>

      <div className="space-y-3 text-sm">

        <p>
          Processor:
          <span className="ml-2">
            {server.processor}
          </span>
        </p>

        <p>
          Memory:
          <span className="ml-2">
            {server.memory}
          </span>
        </p>

        <p>
          Storage:
          <span className="ml-2">
            {server.storage}
          </span>
        </p>

        <p>
          Location:
          <span className="ml-2">
            {server.location}
          </span>
        </p>

      </div>

    </div>
  )
}