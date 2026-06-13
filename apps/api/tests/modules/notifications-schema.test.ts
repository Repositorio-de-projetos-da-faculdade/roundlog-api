import { describe, expect, it } from "vitest";
import {
  subscribeSchema,
  unsubscribeSchema,
  listNotificationsSchema,
} from "../../src/modules/notifications/notifications.schema.js";

describe("subscribeSchema", () => {
  it("aceita payload válido de PushSubscription", () => {
    const r = subscribeSchema.parse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys: { p256dh: "BLah...", auth: "secret123" },
      userAgent: "Mozilla/5.0",
    });
    expect(r.endpoint).toBe("https://fcm.googleapis.com/fcm/send/abc");
    expect(r.keys.p256dh).toBe("BLah...");
  });

  it("rejeita endpoint não-URL", () => {
    expect(() =>
      subscribeSchema.parse({
        endpoint: "not-a-url",
        keys: { p256dh: "x", auth: "y" },
      }),
    ).toThrow();
  });

  it("rejeita keys ausentes", () => {
    expect(() =>
      subscribeSchema.parse({
        endpoint: "https://x.com/y",
        keys: { p256dh: "x" },
      }),
    ).toThrow();
  });
});

describe("unsubscribeSchema", () => {
  it("exige endpoint URL", () => {
    expect(() => unsubscribeSchema.parse({ endpoint: "x" })).toThrow();
    expect(() => unsubscribeSchema.parse({})).toThrow();
  });

  it("aceita endpoint válido", () => {
    expect(() => unsubscribeSchema.parse({ endpoint: "https://x.com/y" })).not.toThrow();
  });
});

describe("listNotificationsSchema", () => {
  it("aplica defaults skip=0 take=20", () => {
    const r = listNotificationsSchema.parse({});
    expect(r.skip).toBe(0);
    expect(r.take).toBe(20);
    expect(r.unreadOnly).toBeUndefined();
  });

  it("limita take a 100", () => {
    expect(() => listNotificationsSchema.parse({ take: "1000" })).toThrow();
  });
});
