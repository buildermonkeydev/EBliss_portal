import { FirewallRule } from "../../firewall/type/firewall";
export default function RuleRow({
  rule,
}: {
  rule: FirewallRule;
}) {
  return (
    <tr className="border-t border-slate-700 hover:bg-slate-700/40 transition">

      <td className="p-4 font-medium">{rule.direction}</td>
      <td>{rule.ipType}</td>
      <td>{rule.protocol}</td>
      <td>{rule.port}</td>
      <td className="text-slate-300">{rule.source}</td>

      <td>
        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm">
          {rule.action}
        </span>
      </td>

      <td className="space-x-3 text-sm">
        <button className="text-indigo-400 hover:text-indigo-300">
          Edit
        </button>

        <button className="text-rose-400 hover:text-rose-300">
          Remove
        </button>
      </td>

    </tr>
  );
}