/**
 * SSRF guard for the SEO audit fetcher. Only public http(s) URLs on standard
 * ports are allowed; private/loopback/link-local/reserved IPs are blocked, both
 * by literal-IP inspection and by resolving the hostname.
 */
import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_PORTS = new Set(["", "80", "443", "8080"]);

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 169 && b === 254) ||                 // link-local
    (a === 172 && b >= 16 && b <= 31) ||        // 172.16/12
    (a === 192 && b === 168) ||                 // 192.168/16
    (a === 100 && b >= 64 && b <= 127) ||       // CGNAT
    a >= 224                                     // multicast / reserved
  );
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase();
  return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v === "::";
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (net.isIPv4(h)) return isPrivateIPv4(h);
  if (net.isIPv6(h)) return isPrivateIPv6(h);
  return false;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; error: string };

export async function validateAuditUrl(input: string): Promise<UrlCheck> {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return { ok: false, error: "Enter a valid URL (including https://)." }; }

  if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false, error: "Only http(s) URLs are supported." };
  if (!ALLOWED_PORTS.has(url.port)) return { ok: false, error: "That port is not allowed." };
  if (isPrivateHost(url.hostname)) return { ok: false, error: "Private or local addresses can't be audited." };

  // Resolve the hostname and ensure no resolved address is private.
  if (!net.isIP(url.hostname)) {
    try {
      const addrs = await dns.lookup(url.hostname, { all: true });
      if (addrs.length === 0) return { ok: false, error: "Could not resolve that domain." };
      for (const a of addrs) {
        const priv = a.family === 6 ? isPrivateIPv6(a.address) : isPrivateIPv4(a.address);
        if (priv) return { ok: false, error: "That domain resolves to a private address." };
      }
    } catch {
      return { ok: false, error: "Could not resolve that domain." };
    }
  }
  return { ok: true, url };
}
