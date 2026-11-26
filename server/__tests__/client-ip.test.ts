import { test } from "node:test";
import assert from "node:assert/strict";
import { getTrustedClientIp } from "../client-ip";

const req = (xff: string | undefined, remote = "10.0.0.5") =>
  ({ headers: xff === undefined ? {} : { "x-forwarded-for": xff }, socket: { remoteAddress: remote } });

test("single public hop is the client", () => {
  assert.equal(getTrustedClientIp(req("93.87.10.20")), "93.87.10.20");
});

test("a forged leftmost hop is ignored - the proxy-appended rightmost public hop wins", () => {
  assert.equal(getTrustedClientIp(req("1.2.3.4, 93.87.10.20")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("8.8.8.8, 1.1.1.1, 93.87.10.20")), "93.87.10.20");
});

test("internal / CGNAT / private hops on the right are skipped", () => {
  assert.equal(getTrustedClientIp(req("93.87.10.20, 100.64.0.3")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("93.87.10.20, 10.1.2.3, 172.16.0.9, 192.168.1.1")), "93.87.10.20");
});

test("IPv6 and IPv4-mapped addresses", () => {
  assert.equal(getTrustedClientIp(req("2a02:2149:8a2c:1::5")), "2a02:2149:8a2c:1::5");
  assert.equal(getTrustedClientIp(req("::ffff:93.87.10.20")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("2a02:2149::5, fd00::1")), "2a02:2149::5");
});

test("no usable public address gives null (limits then don't apply instead of lumping everyone together)", () => {
  assert.equal(getTrustedClientIp(req(undefined)), null);
  assert.equal(getTrustedClientIp(req("10.0.0.1, 127.0.0.1")), null);
});

// ── Behind Cloudflare ──
import { isCloudflareIp, isTrustedProxy } from "../client-ip";

test("Cloudflare edge ranges are recognised (v4 and v6)", () => {
  for (const ip of ["173.245.48.1", "104.16.0.1", "104.23.255.254", "172.64.10.10", "162.159.1.1", "131.0.72.5", "2606:4700::6810:84e5", "2a06:98c7::1", "::ffff:104.16.5.5"]) {
    assert.equal(isCloudflareIp(ip), true, ip);
  }
  for (const ip of ["93.87.10.20", "104.15.255.255", "172.63.0.1", "8.8.8.8", "2a02:2149::5", "not-an-ip"]) {
    assert.equal(isCloudflareIp(ip), false, ip);
  }
});

test("behind Cloudflare the visitor is the hop left of the Cloudflare edge", () => {
  // browser -> Cloudflare (appends visitor) -> Railway (appends the Cloudflare edge)
  assert.equal(getTrustedClientIp(req("93.87.10.20, 162.158.1.2")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("2a02:2149::5, 2606:4700::1, 100.64.0.3")), "2a02:2149::5");
});

test("a forged chain sent straight to the origin can't pose as a Cloudflare-forwarded visitor", () => {
  // attacker (not Cloudflare) sends "victim, <cloudflare ip>"; our edge appends the attacker's real address
  assert.equal(getTrustedClientIp(req("1.2.3.4, 104.16.0.1, 93.87.10.20")), "93.87.10.20");
});

test("isTrustedProxy covers private + Cloudflare, not visitors", () => {
  assert.equal(isTrustedProxy("10.0.0.5"), true);
  assert.equal(isTrustedProxy("104.16.0.1"), true);
  assert.equal(isTrustedProxy("93.87.10.20"), false);
});
