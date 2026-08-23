import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/inbox/route";
import { readProvidedToken, requireInboxAuth } from "@/lib/inbox/auth";
import { readInboxText, shortcutJson } from "@/lib/inbox/shortcut-http";

vi.mock("@/lib/supabase/admin", () => ({
  createServiceRoleClient: () => ({}),
}));

vi.mock("@/lib/inbox/persist", () => ({
  persistInboxTask: vi.fn(async () => ({ id: "task-1" })),
  persistInboxEvent: vi.fn(async () => ({ id: "event-1" })),
  persistInboxSleep: vi.fn(async () => ({ id: "sleep-1" })),
  persistInboxLife: vi.fn(async () => ({ id: "life-1" })),
}));

const TOKEN = "inbox-token-for-tests-32chars!!";
const USER_ID = "user-1";

describe("readProvidedToken", () => {
  it("reads a Bearer header", () => {
    const request = new Request("https://example.com/api/inbox", {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    expect(readProvidedToken(request)).toBe(TOKEN);
  });

  it("reads a raw Authorization value without Bearer", () => {
    const request = new Request("https://example.com/api/inbox", {
      headers: { Authorization: TOKEN },
    });
    expect(readProvidedToken(request)).toBe(TOKEN);
  });

  it("reads X-Inbox-Token", () => {
    const request = new Request("https://example.com/api/inbox", {
      headers: { "X-Inbox-Token": TOKEN },
    });
    expect(readProvidedToken(request)).toBe(TOKEN);
  });

  it("reads a query token for Watch shortcuts that drop headers", () => {
    const request = new Request(
      `https://example.com/api/inbox?token=${encodeURIComponent(TOKEN)}&text=週報`,
    );
    expect(readProvidedToken(request)).toBe(TOKEN);
  });
});

describe("requireInboxAuth", () => {
  const previousToken = process.env.INBOX_TOKEN;
  const previousUser = process.env.INBOX_USER_ID;

  beforeEach(() => {
    process.env.INBOX_TOKEN = TOKEN;
    process.env.INBOX_USER_ID = USER_ID;
  });

  afterEach(() => {
    process.env.INBOX_TOKEN = previousToken;
    process.env.INBOX_USER_ID = previousUser;
  });

  it("accepts the query token", () => {
    const request = new Request(
      `https://example.com/api/inbox?token=${encodeURIComponent(TOKEN)}`,
    );
    expect(requireInboxAuth(request)).toEqual({ ok: true, userId: USER_ID });
  });

  it("rejects a wrong query token", () => {
    const request = new Request("https://example.com/api/inbox?token=nope");
    expect(requireInboxAuth(request)).toMatchObject({
      ok: false,
      speak: "認証に失敗しました",
    });
  });
});

describe("readInboxText", () => {
  it("reads the text query used by GET shortcuts", async () => {
    const request = new Request(
      `https://example.com/api/inbox?text=${encodeURIComponent("試薬発注をタスクに入れて")}`,
    );
    await expect(readInboxText(request)).resolves.toBe(
      "試薬発注をタスクに入れて",
    );
  });

  it("reads JSON { text }", async () => {
    const request = new Request("https://example.com/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "  お風呂  " }),
    });
    await expect(readInboxText(request)).resolves.toBe("お風呂");
  });

  it("reads form-urlencoded text", async () => {
    const request = new Request("https://example.com/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "text=%E6%98%BC%E9%A3%9F",
    });
    await expect(readInboxText(request)).resolves.toBe("昼食");
  });

  it("reads a plain-text body when JSON is not used", async () => {
    const request = new Request("https://example.com/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: "おはよう",
    });
    await expect(readInboxText(request)).resolves.toBe("おはよう");
  });
});

describe("shortcutJson", () => {
  it("always returns HTTP 200 so Shortcuts does not drop the connection", async () => {
    const response = shortcutJson({ ok: false, speak: "認証に失敗しました" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: false,
      speak: "認証に失敗しました",
    });
  });
});

describe("GET /api/inbox", () => {
  const previousToken = process.env.INBOX_TOKEN;
  const previousUser = process.env.INBOX_USER_ID;

  beforeEach(() => {
    process.env.INBOX_TOKEN = TOKEN;
    process.env.INBOX_USER_ID = USER_ID;
  });

  afterEach(() => {
    process.env.INBOX_TOKEN = previousToken;
    process.env.INBOX_USER_ID = previousUser;
  });

  it("does not return empty 405 for GET", async () => {
    const response = await GET(
      new Request("https://example.com/api/inbox", { method: "GET" }),
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; speak: string };
    expect(body.ok).toBe(false);
    expect(body.speak).toBeTruthy();
  });

  it("creates a task from GET query text and token", async () => {
    const url = new URL("https://example.com/api/inbox");
    url.searchParams.set("token", TOKEN);
    url.searchParams.set("text", "試薬発注をタスクに入れて");
    const response = await GET(new Request(url, { method: "GET" }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      ok: boolean;
      kind?: string;
      speak: string;
    };
    expect(body.ok).toBe(true);
    expect(body.kind).toBe("task");
    expect(body.speak).toContain("タスクに入れました");
  });
});
