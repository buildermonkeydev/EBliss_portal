import { FirewallRule } from "../../firewall/type/firewall";

export default function FirewallCard({
  rule,
  onDelete,
}: {
  rule: FirewallRule;
  onDelete: (id: number) => void;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 shadow hover:shadow-xl transition">

      {/* Top Row */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {rule.direction} • {rule.ipType} • {rule.protocol} • {rule.port}
        </h3>

        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm">
          {rule.action}
        </span>
      </div>

      {/* Source */}
      <p className="text-slate-400 mt-3">
        Source/Destination: {rule.source}
      </p>

      {/* Actions */}
      <div className="flex justify-end gap-4 mt-5 text-sm">
        <button className="text-indigo-400 hover:text-indigo-300">
          Edit
        </button>

        <button
          onClick={() => onDelete(rule.id)}
          className="text-rose-400 hover:text-rose-300"
        >
          Delete
        </button>
      </div>
    </div>
  );
}