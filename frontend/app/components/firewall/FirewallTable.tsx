import RuleRow from  '../firewall/RuleRow';
import { FirewallRule } from "../../firewall/type/firewall";

type FirewallTableProps = {
  rules: FirewallRule[];
};

export default function FirewallTable({ rules }: FirewallTableProps) {
  return (
    <div className="mt-8 bg-slate-800/70 backdrop-blur rounded-2xl shadow border border-slate-700 overflow-hidden">

      <table className="w-full text-left">

        <thead className="bg-slate-900 text-slate-400 text-sm uppercase">
          <tr>
            <th className="p-4">Direction</th>
            <th>IP Type</th>
            <th>Protocol</th>
            <th>Port</th>
            <th>Source / Dest</th>
            <th>Action</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </tbody>

      </table>

      <div className="p-4 text-sm text-slate-400 border-t border-slate-700">
        Showing {rules.length} rules
      </div>

    </div>
  );
}