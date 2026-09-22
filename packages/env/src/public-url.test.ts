import { describe, expect, test } from "bun:test";

import { isAllowedPublicUrl } from "./public-url";

describe("isAllowedPublicUrl", () => {
  test("em produção só aceita https", () => {
    expect(isAllowedPublicUrl("https://bloomy.laridev.com", "production")).toBe(true);
    expect(isAllowedPublicUrl("http://bloomy.laridev.com", "production")).toBe(false);
  });

  test("fora de produção aceita http (dev local em localhost)", () => {
    expect(isAllowedPublicUrl("http://localhost:3001", "development")).toBe(true);
    expect(isAllowedPublicUrl("http://localhost:3001", "test")).toBe(true);
    expect(isAllowedPublicUrl("http://localhost:3001", undefined)).toBe(true);
  });
});
