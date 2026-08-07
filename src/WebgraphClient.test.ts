import { describe, it, expect, vi } from "vitest";
import { WebgraphClient } from "./WebgraphClient.js";
import type { PlanAction } from "./types.js";

function mockFetch(payload: unknown) {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

const BASE = "https://graph.test";

describe("WebgraphClient", () => {
  it("posts an observation to the app-scoped path", async () => {
    const f = mockFetch({ view: { signature: "a".repeat(64) } });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.observe("myapp", { urlPath: "/", regions: [] });
    expect(f).toHaveBeenCalledWith(
      `${BASE}/apps/myapp/observations`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends the api key header", async () => {
    const f = mockFetch({ apps: [] });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "secret",
      fetchImpl: f,
    });
    await client.graph("myapp");
    const init = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect((init.headers as Record<string, string>)["X-Api-Key"]).toBe("secret");
  });

  it("builds the route query from the view refs", async () => {
    const f = mockFetch({ route: null });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.route("myapp", {
      to: { urlPath: "/checkout", signature: "b".repeat(64) },
    });
    const url = (f as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain("toUrlPath=%2Fcheckout");
    expect(url).toContain(`toSignature=${"b".repeat(64)}`);
  });

  it("omits an absent signature from the query", async () => {
    const f = mockFetch({ transition: null });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.nextStep("myapp", { to: { urlPath: "/docs" } });
    const url = (f as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).not.toContain("toSignature");
  });

  it("forwards a raw query string verbatim", async () => {
    const f = mockFetch({ route: null });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.proxyGet("myapp", "route", "toUrlPath=%2Fcheckout&maxDepth=3");
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      `${BASE}/apps/myapp/route?toUrlPath=%2Fcheckout&maxDepth=3`
    );
  });

  it("omits the question mark when there is no query string", async () => {
    const f = mockFetch({ views: [], transitions: [] });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.proxyGet("myapp", "graph", "");
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
      `${BASE}/apps/myapp/graph`
    );
  });

  it("strips a trailing slash from the base url", async () => {
    const f = mockFetch({ apps: [] });
    const client = new WebgraphClient({
      baseUrl: `${BASE}/`,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.graph("myapp");
    expect(
      (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]
    ).toBe(`${BASE}/apps/myapp/graph`);
  });
  it("posts a goal to the plan endpoint", async () => {
    const f = mockFetch({ actions: [] });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.plan("myapp", { goal: "add to cart" });
    expect(f).toHaveBeenCalledWith(
      `${BASE}/apps/myapp/plan`,
      expect.objectContaining({ method: "POST" })
    );
  });

  it("posts a failure report to the replan endpoint", async () => {
    const f = mockFetch({ actions: [] });
    const client = new WebgraphClient({
      baseUrl: BASE,
      apiKey: "k",
      fetchImpl: f,
    });
    await client.replan("myapp", {
      goal: "add to cart",
      from: { urlPath: "/shop" },
      failed: { transitionId: 3, reason: "not found" },
    });
    const init = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(JSON.parse(init.body as string).failed.transitionId).toBe(3);
  });
  it("types a fill action as carrying a value", () => {
    const action: PlanAction = {
      kind: "fill",
      controlName: "Search",
      value: "mac mini",
      onViewId: 1,
    };
    expect(action.value).toBe("mac mini");
  });
});
