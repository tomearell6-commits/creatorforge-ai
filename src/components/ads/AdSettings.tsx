"use client";

import { Card, CardTitle } from "@/components/ui/Card";
import { AD_PLATFORMS, AD_CREDIT_COSTS } from "@/lib/constants";

export function AdSettings() {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <CardTitle className="text-base">Credit costs</CardTitle>
        <Card>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            <li className="flex justify-between"><span>Campaign creation</span><span className="text-muted-foreground">Free (draft)</span></li>
            <li className="flex justify-between"><span>AI ad copy pack</span><span className="font-medium">{AD_CREDIT_COSTS.copy} credits</span></li>
            <li className="flex justify-between"><span>AI image creative</span><span className="font-medium">{AD_CREDIT_COSTS.image} credits</span></li>
            <li className="flex justify-between"><span>AI video creative</span><span className="font-medium">{AD_CREDIT_COSTS.video} credits</span></li>
            <li className="flex justify-between"><span>AI campaign analysis</span><span className="font-medium">{AD_CREDIT_COSTS.analysis} credits</span></li>
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Viewing campaigns and reports is always free.</p>
        </Card>
      </section>

      <section className="space-y-2">
        <CardTitle className="text-base">Platform capabilities</CardTitle>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Platform</th><th className="p-3">Formats</th><th className="p-3">Publish</th><th className="p-3">Reporting</th></tr>
            </thead>
            <tbody>
              {AD_PLATFORMS.map((p) => (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 text-xs text-muted-foreground">{p.formats.join(", ")}</td>
                  <td className="p-3">{p.supportsPublish ? "Yes (API approval req.)" : "No"}</td>
                  <td className="p-3">{p.supportsReporting ? "Yes" : "Limited"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted-foreground">Publishing/reporting features activate per platform once its official Ads API app is approved and configured. CreatorsForge only uses supported APIs and permissions.</p>
      </section>
    </div>
  );
}
