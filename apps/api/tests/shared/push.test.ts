import { describe, expect, it, beforeEach } from "vitest";
import { isPushEnabled } from "../../src/shared/push.js";

describe("isPushEnabled", () => {
  beforeEach(() => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
  });

  it("retorna false sem VAPID keys", () => {
    expect(isPushEnabled()).toBe(false);
  });

  it("retorna false se só uma das chaves está definida", () => {
    process.env.VAPID_PUBLIC_KEY = "pub";
    expect(isPushEnabled()).toBe(false);
    delete process.env.VAPID_PUBLIC_KEY;
    process.env.VAPID_PRIVATE_KEY = "priv";
    expect(isPushEnabled()).toBe(false);
    delete process.env.VAPID_PRIVATE_KEY;
  });
});
