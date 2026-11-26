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
