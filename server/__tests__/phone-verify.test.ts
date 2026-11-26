import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { generatePhoneCode, extractPhoneCode, hashPhone, verifyMetaSignature, parseInboundMessages, whatsappLink } from "../phone-verify";

test("codes look like LF-XXXXXX without ambiguous characters", () => {
  for (let i = 0; i < 200; i++) {
    const c = generatePhoneCode();
    assert.match(c, /^LF-[A-HJKMNP-Z2-9]{6}$/);
  }
});

test("the code is found in the prefilled message and in sloppy variants", () => {
  assert.equal(extractPhoneCode("Moj kod za potvrdu naloga na Studio LeFlow: LF-7K2QXM"), "LF-7K2QXM");
  assert.equal(extractPhoneCode("lf-7k2qxm"), "LF-7K2QXM");
  assert.equal(extractPhoneCode("LF 7K2QXM hvala"), "LF-7K2QXM");
  assert.equal(extractPhoneCode("LF7K2QXM"), "LF-7K2QXM");
  assert.equal(extractPhoneCode("zdravo, kada radite?"), null);
  assert.equal(extractPhoneCode("LF-7K2"), null);
});

test("phone hash ignores formatting and depends on the secret", () => {
  assert.equal(hashPhone("+381 64 123 4567", "s"), hashPhone("381641234567", "s"));
  assert.notEqual(hashPhone("381641234567", "s"), hashPhone("381641234567", "other"));
  assert.notEqual(hashPhone("381641234567", "s"), hashPhone("381641234568", "s"));
  assert.ok(!hashPhone("381641234567", "s").includes("381641234567"));
});

test("Meta webhook signature is checked against the raw body", () => {
  const body = Buffer.from('{"entry":[]}');
  const sig = "sha256=" + createHmac("sha256", "appsecret").update(body).digest("hex");
  assert.equal(verifyMetaSignature(body, sig, "appsecret"), true);
  assert.equal(verifyMetaSignature(body, sig, "wrong"), false);
  assert.equal(verifyMetaSignature(Buffer.from('{"entry":[1]}'), sig, "appsecret"), false);
  assert.equal(verifyMetaSignature(body, undefined, "appsecret"), false);
  assert.equal(verifyMetaSignature(body, "sha256=zz", "appsecret"), false);
  assert.equal(verifyMetaSignature(body, sig, ""), false);
});

test("inbound text messages are pulled out of the Cloud API payload", () => {
  const payload = { entry: [{ changes: [{ value: {
    metadata: { display_phone_number: "381601234567" },
    messages: [
      { from: "381641234567", type: "text", text: { body: "LF-7K2QXM" } },
      { from: "381651111111", type: "image", image: {} },
    ],
    statuses: [{ id: "x" }],
  } }] }] };
  assert.deepEqual(parseInboundMessages(payload), [{ from: "381641234567", text: "LF-7K2QXM" }]);
  assert.deepEqual(parseInboundMessages({}), []);
  assert.deepEqual(parseInboundMessages(null), []);
});

test("wa.me link carries the number and the prefilled code", () => {
  const l = whatsappLink("+381 60 123 4567", "LF-7K2QXM");
  assert.ok(l.startsWith("https://wa.me/381601234567?text="));
  assert.ok(decodeURIComponent(l).includes("LF-7K2QXM"));
});
