import { expect, test } from "@playwright/test";

const unique = () => `E2E idea ${Date.now()} ${Math.random().toString(36).slice(2, 6)}`;

test("post an idea, vote on it and comment", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/what should/i);

  const text = unique();
  await page.getByRole("button", { name: "Post an idea" }).first().click();
  await page.getByLabel("Your idea").fill(text);
  await page.getByPlaceholder(/tags/).fill("e2e");
  await page.getByRole("button", { name: "Post idea" }).click();

  // First write asks for a name.
  await page.getByLabel("Display name").fill("Playwright");
  const posted = page.waitForResponse(
    (r) => r.url().endsWith("/api/ideas") && r.request().method() === "POST" && r.ok(),
  );
  await page.getByRole("button", { name: "Save name" }).click();
  await posted; // saving the name resumes the post; don't navigate away mid-request

  // The board opens on the curated "Worth solving" set; a new idea shows under "all".
  await page.goto("/?tag=all#all-ideas");
  const all = page.getByRole("region", { name: /all ideas/i });
  await all.getByRole("button", { name: "Newest" }).click();
  const row = all.locator("li", { hasText: text });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: /vote for this idea/i }).click();
  await expect(row.getByRole("button", { name: /remove your vote/i })).toBeVisible();

  await row.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/i\/\d+/);
  await page.getByLabel("Add a comment").fill("Looks great");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Looks great")).toBeVisible();

  // Deep link survives a reload (SPA fallback).
  await page.reload();
  await expect(page.getByText("Looks great")).toBeVisible();
});

test("search from the command palette", async ({ page, isMobile }) => {
  test.skip(isMobile, "keyboard shortcut is a desktop affordance");
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/search ideas or type a command/i).fill("roadmap");
  await page.getByText("Open the roadmap").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/from spark/i);
});

test("roadmap shows all four columns", async ({ page }) => {
  await page.goto("/roadmap");
  for (const name of ["Open", "Planned", "Building", "Shipped"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
});

test("API contract from the brief", async ({ request }) => {
  const created = await request.post("/api/ideas", { data: { content: "My new idea" } });
  expect(created.status()).toBe(201);
  const idea = (await created.json()) as { id: number; content: string; created_at: string };
  expect(idea.content).toBe("My new idea");
  const list = await request.get("/api/ideas");
  expect(Array.isArray(await list.json())).toBe(true);
});
