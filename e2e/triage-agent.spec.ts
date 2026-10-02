import { test, expect } from "@playwright/test";

let ticketId: string | null = null;

test.afterEach(async ({ request }) => {
  if (ticketId) await request.delete(`/api/tickets/${ticketId}`);
  ticketId = null;
});

test("create button is disabled until a title is entered", async ({ page }) => {
  await page.goto("/tickets");
  const button = page.getByRole("button", { name: "Create Ticket" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Title").fill("Something");
  await expect(button).toBeEnabled();
});

test("create → AI triage → agent proposes → confirm", async ({ page }) => {
  const title = `E2E checkout down ${Date.now()}`;

  // Create
  await page.goto("/tickets");
  await page.getByLabel("Title").fill(title);
  await page
    .getByLabel("Detail (optional)")
    .fill("All customers get a 500 error at payment. Production is down.");
  await page.getByRole("button", { name: "Create Ticket" }).click();

  const link = page.getByRole("link", { name: title });
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForURL(/\/tickets\/[^/]+$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible({
    timeout: 30_000,
  });
  ticketId = page.url().split("/").pop() ?? null;

  // Triage runs in the background: reload until it lands
  await expect
    .poll(
      async () => {
        await page.reload();
        return page.getByText("AI summary:").isVisible();
      },
      { timeout: 60_000, intervals: [2_000] }
    )
    .toBe(true);

  // Agent proposes a status change, nothing applies until confirmed
  await page.getByLabel("Message the assistant").fill("Mark this as in progress");
  await page.getByRole("button", { name: "Send" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("header").getByText("OPEN")).toBeVisible();

  await dialog.getByRole("button", { name: "Confirm" }).click();
  await expect(page.locator("header").getByText("IN PROGRESS")).toBeVisible();
});