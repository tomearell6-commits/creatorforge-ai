import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTwoFactorStatus } from "@/lib/security/twofactor";
import { verifyTwoFactorCookie, TWO_FACTOR_COOKIE } from "@/lib/security/twofactor-cookie";
import { cookies } from "next/headers";

/** Current user's 2FA status + whether THIS browser is already verified. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getTwoFactorStatus(user.id);
  const jar = await cookies();
  const verified = status.enabled
    ? await verifyTwoFactorCookie(jar.get(TWO_FACTOR_COOKIE)?.value, user.id)
    : true;
  return NextResponse.json({ ...status, verifiedThisBrowser: verified });
}
