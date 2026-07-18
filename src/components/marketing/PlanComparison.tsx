import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { COMPARISON_ROWS, COMPARISON_GROUPS, type FeatureValue } from "@/config/billing";
import { PLANS } from "@/lib/constants";

/**
 * Full plan-by-plan feature matrix for the PUBLIC pricing page. The data
 * (COMPARISON_ROWS/GROUPS) already existed and was served by the billing API,
 * but nothing rendered it — so prospects could only see ~5 bullets per plan
 * before paying. This surfaces the complete picture, grouped by area.
 */
function Cell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-brand-600" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" aria-label="Not included" />;
  return <span className="text-xs font-medium">{value}</span>;
}

export function PlanComparison() {
  // Show every real tier as a column (free → enterprise).
  const cols = PLANS;

  return (
    <div className="mt-20">
      <h2 className="text-center text-2xl font-bold tracking-tight">Compare every plan</h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Everything you get on each plan — see the full value before you choose.
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 p-3 text-left font-semibold">Feature</th>
              {cols.map((p) => (
                <th key={p.id} className="p-3 text-center font-semibold">
                  <div>{p.name}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {p.custom ? "Custom" : `$${p.price}/mo`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_GROUPS.map((group) => {
              const rows = COMPARISON_ROWS.filter((r) => r.group === group.id);
              if (!rows.length) return null;
              return (
                <Fragment key={group.id}>
                  <tr className="border-b border-border bg-muted/20">
                    <td colSpan={cols.length + 1} className="px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-border last:border-0">
                      <td className="sticky left-0 z-10 bg-background p-3 text-left">{row.label}</td>
                      {cols.map((p) => (
                        <td key={p.id} className="p-3 text-center">
                          <Cell value={row.values[p.id as keyof typeof row.values]} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
