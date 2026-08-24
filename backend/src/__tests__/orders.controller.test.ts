import "./test-env";
import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { createOrderWithDeps } from "../controllers/orders.controller";
import type { Request, Response } from "express";

function mockRes() {
  const res: Partial<Response> & { statusCode: number; body: unknown } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res as Response;
    },
    json(payload: unknown) {
      res.body = payload;
      return res as Response;
    },
  };
  return res as Response & { statusCode: number; body: any };
}

function mockReq(body: unknown): Request {
  return { body } as Request;
}

describe("createOrder — isolation SMS", () => {
  it("enregistre la commande même si Orange SMS échoue", async () => {
    let committed = false;
    let insertedOrder = false;
    let rolledBack = false;

    const client = {
      query: mock.fn(async (sql: string) => {
        if (sql.includes("BEGIN")) return { rows: [] };
        if (sql.includes("SELECT id FROM tables")) return { rows: [] };
        if (sql.includes("INSERT INTO orders")) {
          insertedOrder = true;
          return { rows: [{ id: 42, table_number: "3", total_amount: 1600 }] };
        }
        if (sql.includes("INSERT INTO order_items")) return { rows: [] };
        if (sql.includes("COMMIT")) {
          committed = true;
          return { rows: [] };
        }
        if (sql.includes("ROLLBACK")) {
          rolledBack = true;
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: mock.fn(),
    };

    const fakePool = {
      connect: async () => client,
      query: mock.fn(async () => ({ rows: [] })),
    };

    const sendOrderSms = mock.fn(async () => ({
      success: false,
      errorMessage: "Orange SMS: insufficient units. Purchase an SMS bundle in Orange Developer.",
      errorKind: "insufficient_units" as const,
    }));

    const res = mockRes();
    await createOrderWithDeps(
      mockReq({
        table_number: "3",
        items: [{ id: "burger-poulet-epice", name: "Burger poulet épicé", price: 1600, qty: 1 }],
      }),
      res,
      { pool: fakePool, sendOrderSms }
    );

    assert.equal(insertedOrder, true);
    assert.equal(committed, true);
    assert.equal(rolledBack, false);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.order_id, 42);
    assert.equal(res.body.sms_status, "failed");
    assert.equal(sendOrderSms.mock.callCount(), 1);
  });

  it("enregistre la commande même si sendOrderSms jette une exception", async () => {
    const client = {
      query: mock.fn(async (sql: string) => {
        if (sql.includes("INSERT INTO orders")) {
          return { rows: [{ id: 7, table_number: "1", total_amount: 1000 }] };
        }
        return { rows: [] };
      }),
      release: mock.fn(),
    };

    const res = mockRes();
    await createOrderWithDeps(
      mockReq({
        table_number: "1",
        items: [{ id: "nuggets", name: "Nuggets", price: 1000, qty: 1 }],
      }),
      res,
      {
        pool: {
          connect: async () => client,
          query: async () => ({ rows: [] }),
        },
        sendOrderSms: async () => {
          throw new Error("réseau coupé");
        },
      }
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.sms_status, "failed");
  });

  it("relache le client DB avant d'envoyer le SMS", async () => {
    let released = false;

    const client = {
      query: mock.fn(async (sql: string) => {
        if (sql.includes("BEGIN")) return { rows: [] };
        if (sql.includes("SELECT id FROM tables")) return { rows: [] };
        if (sql.includes("INSERT INTO orders")) {
          return { rows: [{ id: 99, table_number: "5", total_amount: 2400 }] };
        }
        if (sql.includes("INSERT INTO order_items")) return { rows: [] };
        if (sql.includes("COMMIT")) return { rows: [] };
        if (sql.includes("ROLLBACK")) return { rows: [] };
        return { rows: [] };
      }),
      release: mock.fn(() => {
        released = true;
      }),
    };

    const res = mockRes();
    await createOrderWithDeps(
      mockReq({
        table_number: "5",
        items: [{ id: "chicken-wrap", name: "Wrap poulet", price: 2400, qty: 1 }],
      }),
      res,
      {
        pool: {
          connect: async () => client,
          query: async () => ({ rows: [] }),
        },
        sendOrderSms: async () => {
          assert.equal(released, true);
          return { success: true, messageId: "msg-1" };
        },
      }
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.sms_status, "sent");
    assert.equal(released, true);
  });
});
