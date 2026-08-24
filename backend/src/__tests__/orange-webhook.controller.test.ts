import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { processOrangeSmsDeliveryReceipt } from "../controllers/orange-webhook.controller";

describe("Orange SMS delivery receipt", () => {
  it("maps DeliveredToTerminal and computes delivery latency", async () => {
    const record = {
      id: 1,
      orange_resource_id: "abc123",
      accepted_at: "2026-08-24T10:00:00.000Z",
      requested_at: "2026-08-24T09:59:55.000Z",
      delivered_at: null,
      failed_at: null,
      callback_received_at: null,
      error_message: null,
      error_code: null,
      status: "ACCEPTED",
      orange_delivery_status: null,
      request_duration_ms: 512,
      delivery_latency_ms: null,
      total_latency_ms: null,
    };

    const updates: any[] = [];
    const result = await processOrangeSmsDeliveryReceipt(
      {
        deliveryInfoNotification: {
          callbackData: "abc123",
          deliveryInfo: {
            address: "tel:+237650123456",
            deliveryStatus: "DeliveredToTerminal",
          },
        },
      },
      {
        now: () => new Date("2026-08-24T10:00:06.000Z"),
        findByOrangeResourceId: async () => record as any,
        updateByOrangeResourceId: async (_id, patch) => {
          updates.push(patch);
          return { ...record, ...patch } as any;
        },
      }
    );

    assert.equal(result.processed, true);
    assert.equal(result.status, "DELIVERED");
    assert.equal(result.orangeDeliveryStatus, "DeliveredToTerminal");
    assert.equal(result.deliveryLatencyMs, 6000);
    assert.equal(result.totalLatencyMs, 11000);
    assert.equal(updates.length, 1);
    assert.equal(updates[0].status, "DELIVERED");
  });

  it("maps MessageWaiting to PENDING and accepts duplicate callbacks", async () => {
    const record = {
      id: 2,
      orange_resource_id: "dup-1",
      accepted_at: "2026-08-24T10:00:00.000Z",
      requested_at: "2026-08-24T09:59:59.000Z",
      delivered_at: null,
      failed_at: null,
      callback_received_at: null,
      error_message: null,
      error_code: null,
      status: "ACCEPTED",
      orange_delivery_status: null,
      request_duration_ms: 300,
      delivery_latency_ms: null,
      total_latency_ms: null,
    };

    let updateCount = 0;
    const deps = {
      now: () => new Date("2026-08-24T10:00:03.000Z"),
      findByOrangeResourceId: async () => record as any,
      updateByOrangeResourceId: async (_id: string, patch: any) => {
        updateCount += 1;
        return { ...record, ...patch } as any;
      },
    };

    const first = await processOrangeSmsDeliveryReceipt(
      {
        deliveryInfoNotification: {
          callbackData: "dup-1",
          deliveryInfo: {
            address: "tel:+237650123456",
            deliveryStatus: "MessageWaiting",
          },
        },
      },
      deps
    );

    const second = await processOrangeSmsDeliveryReceipt(
      {
        deliveryInfoNotification: {
          callbackData: "dup-1",
          deliveryInfo: {
            address: "tel:+237650123456",
            deliveryStatus: "MessageWaiting",
          },
        },
      },
      deps
    );

    assert.equal(first.processed, true);
    assert.equal(first.status, "PENDING");
    assert.equal(second.processed, true);
    assert.equal(second.status, "PENDING");
    assert.equal(updateCount, 2);
  });

  it("returns ok for unknown resource IDs", async () => {
    const result = await processOrangeSmsDeliveryReceipt(
      {
        deliveryInfoNotification: {
          callbackData: "missing",
          deliveryInfo: {
            address: "tel:+237650123456",
            deliveryStatus: "DeliveryImpossible",
          },
        },
      },
      {
        findByOrangeResourceId: async () => null,
      }
    );

    assert.equal(result.processed, false);
    assert.equal(result.reason, "unknown_resource_id");
  });

  it("rejects invalid payloads without failing", async () => {
    const result = await processOrangeSmsDeliveryReceipt({}, {});
    assert.equal(result.processed, false);
    assert.equal(result.reason, "invalid");
  });
});

