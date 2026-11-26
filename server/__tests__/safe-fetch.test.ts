import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateAddress, assertPublicUrl } from "../safe-fetch";

test("private and special addresses are refused", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
    "100.64.0.1", "0.0.0.0", "224.0.0.1", "255.255.255.255", "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "64:ff9b::a00:1"]) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
});

test("public addresses are allowed", () => {
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "151.101.1.1", "2606:4700::1111", "::ffff:8.8.8.8"]) {
    assert.equal(isPrivateAddress(ip), false, ip);
  }
});

test("bad URLs are refused before any request", async () => {
  for (const u of ["file:///etc/passwd", "ftp://example.com", "http://localhost/", "http://127.0.0.1/", "http://[::1]/",
    "http://169.254.169.254/latest/meta-data", "http://example.com:8080/", "http://user:pw@example.com/", "http://db.railway.internal/", "not a url"]) {
    await assert.rejects(assertPublicUrl(u), u);
  }
});
