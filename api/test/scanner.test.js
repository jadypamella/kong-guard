import { scanText } from "../src/scanner.js";

test("flags password", () => {
  const r = scanText('const password = "secret123"');
  expect(r.ok).toBe(false);
  expect(r.reasons).toContain("Potential password");
});

test("flags AWS key id", () => {
  const r = scanText("AKIAABCDEFGHIJKLMNOP");
  expect(r.ok).toBe(false);
  expect(r.reasons).toContain("AWS key id");
});