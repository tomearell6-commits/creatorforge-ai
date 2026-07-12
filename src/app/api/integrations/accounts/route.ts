/**
 * GET /api/integrations/accounts
 * Unified Connected Accounts list across all categories (social / advertising /
 * website / email). Never returns tokens. Also returns the full destination
 * registry so the UI can offer "Connect" for platforms not yet connected.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConnectedAccounts, groupByCategory } from "@/lib/publishing/unified";
import { PUBLISH_DESTINATIONS, AD_PLATFORM_DESTINATIONS } from "@/config/publishingCapabilities";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getConnectedAccounts(supabase);
  const grouped = groupByCategory(accounts);

  const registry = {
    publish: Object.values(PUBLISH_DESTINATIONS).map((d) => ({
      id: d.id, label: d.label, brandIcon: d.brandIcon, accountType: d.accountType,
      live: d.live, permissions: d.permissions,
    })),
    advertising: Object.values(AD_PLATFORM_DESTINATIONS).map((d) => ({
      id: d.id, label: d.label, brandIcon: d.brandIcon, accountType: "advertising" as const,
      live: d.live, permissions: d.permissions,
    })),
  };

  return NextResponse.json({ accounts, grouped, registry });
}
