import { test } from "node:test";
import assert from "node:assert/strict";
import { getTrustedClientIp, isCloudflareIp } from "../client-ip";

// Railway's edge rewrites X-Forwarded-For to "<who connected>, <Railway edge>"
// (observed in production 2026-11-26). 152.233.x / 95.173.x are Railway edges.
const req = (xff: string | undefined, extra: Record<string, string> = {}, remote = "10.0.0.5") =>
  ({ headers: { ...(xff === undefined ? {} : { "x-forwarded-for": xff }), ...extra }, socket: { remoteAddress: remote } });

test("direct visit: the hop left of Railway's edge is the visitor", () => {
  assert.equal(getTrustedClientIp(req("93.86.167.76, 152.233.12.242")), "93.86.167.76");
  assert.equal(getTrustedClientIp(req("2a02:2149:8a2c:1::5, 152.233.13.164")), "2a02:2149:8a2c:1::5");
});

test("Railway's edge address is never returned as the visitor", () => {
  assert.notEqual(getTrustedClientIp(req("93.86.167.76, 152.233.12.242")), "152.233.12.242");
});

test("behind Cloudflare the visitor comes from CF-Connecting-IP", () => {
  assert.equal(getTrustedClientIp(req("172.68.152.220, 95.173.199.194", { "cf-connecting-ip": "93.86.167.76" })), "93.86.167.76");
  assert.equal(getTrustedClientIp(req("2606:4700::1, 95.173.199.194", { "cf-connecting-ip": "2a02:2149::5" })), "2a02:2149::5");
});

test("a forged CF-Connecting-IP sent straight to Railway is ignored", () => {
  assert.equal(getTrustedClientIp(req("93.86.167.76, 152.233.12.242", { "cf-connecting-ip": "5.6.7.8" })), "93.86.167.76");
});

test("Cloudflare peer without a usable CF-Connecting-IP gives null (no lumping everyone onto a Cloudflare edge)", () => {
  assert.equal(getTrustedClientIp(req("172.68.152.220, 95.173.199.194")), null);
  assert.equal(getTrustedClientIp(req("172.68.152.220, 95.173.199.194", { "cf-connecting-ip": "not-an-ip" })), null);
  assert.equal(getTrustedClientIp(req("172.68.152.220, 95.173.199.194", { "cf-connecting-ip": "10.0.0.1" })), null);
});

test("single hop and internal hops", () => {
  assert.equal(getTrustedClientIp(req("93.87.10.20")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("93.87.10.20, 100.64.0.3")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("93.87.10.20, 10.1.2.3, 172.16.0.9, 192.168.1.1")), "93.87.10.20");
  assert.equal(getTrustedClientIp(req("::ffff:93.87.10.20")), "93.87.10.20");
});

test("no usable public address gives null", () => {
  assert.equal(getTrustedClientIp(req(undefined)), null);
  assert.equal(getTrustedClientIp(req("10.0.0.1, 127.0.0.1")), null);
  assert.equal(getTrustedClientIp(req(undefined, {}, "93.87.10.20")), "93.87.10.20");
});

test("Cloudflare edge ranges are recognised (v4 and v6)", () => {
  for (const ip of ["173.245.48.1", "104.16.0.1", "104.23.255.254", "172.64.10.10", "172.68.152.220", "162.159.1.1", "131.0.72.5", "2606:4700::6810:84e5", "2a06:98c7::1", "::ffff:104.16.5.5"]) {
    assert.equal(isCloudflareIp(ip), true, ip);
  }
  for (const ip of ["93.86.167.76", "104.15.255.255", "172.63.0.1", "152.233.12.242", "2a02:2149::5", "not-an-ip"]) {
    assert.equal(isCloudflareIp(ip), false, ip);
  }
});
