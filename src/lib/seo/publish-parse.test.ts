import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseCreatedPost } from "./publish";

describe("parseCreatedPost", () => {
  it("reads normal JSON", () => {
    expect(parseCreatedPost('{"id":42,"link":"https://x.example/a/","status":"publish"}')).toEqual({ ok: true, post: { id: 42, link: "https://x.example/a/", status: "publish" } });
  });
  it("finds the JSON when PHP notices were printed in front of it", () => {
    const raw = '<br />\n<b>Warning</b>:  Undefined array key "x" in <b>/home/site/plugin.php</b> on line 12<br />\n{"id":77,"link":"https://x.example/b/","status":"publish"}';
    const r = parseCreatedPost(raw);
    expect(r.ok && r.post.id).toBe(77);
  });
  it("describes a firewall or maintenance page instead of failing with a bare parse error", () => {
    const html = '<!DOCTYPE html><html style="height:100%"><head><title> 406 Not Acceptable </title><style>body{x:1}</style></head><body>This request is not acceptable</body></html>';
    const r = parseCreatedPost(html);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.snippet).toContain("406 Not Acceptable"); expect(r.snippet).not.toContain("<"); expect(r.snippet).not.toContain("body{x:1}"); }
  });
  it("does not mistake an unrelated JSON object for a post", () => {
    expect(parseCreatedPost('{"code":"rest_forbidden","message":"no"}').ok).toBe(false);
    expect(parseCreatedPost("").ok).toBe(false);
  });
});

import { CAPTCHA_MESSAGE, isCaptchaPage } from "./publish";
describe("host captcha pages", () => {
  it("recognises the real Imunify360 / reCAPTCHA answer Natures Fertilizer received", () => {
    expect(isCaptchaPage('https://recaptcha.cloud/?template=cpg&server=198.251.89.30 "Human verification JavaScript is required. Please enable JavaScript in your browser settings to complete human verification."')).toBe(true);
    expect(isCaptchaPage("Checking your browser before accessing the site")).toBe(true);
  });
  it("does not mistake an ordinary page or a maintenance notice for a captcha", () => {
    expect(isCaptchaPage("406 Not Acceptable This request is not acceptable")).toBe(false);
    expect(isCaptchaPage("We are performing scheduled maintenance. Back soon.")).toBe(false);
  });
  it("tells the owner what to ask their host", () => {
    expect(CAPTCHA_MESSAGE).toMatch(/host/i);
    expect(CAPTCHA_MESSAGE).toMatch(/\/wp-json\//);
  });
});
