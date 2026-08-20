import { expect, type Page } from "@playwright/test";

export function searchBox(page: Page) {
  return page.getByRole("combobox", { name: "Location or coordinates" });
}

export async function openHome(page: Page, path = "/") {
  await page.addInitScript(() => {
    const marker = "e2e:storage-ready";
    if (!sessionStorage.getItem(marker)) {
      localStorage.clear();
      sessionStorage.setItem(marker, "1");
    }
  });
  await page.goto(path);
}

export async function typePlace(page: Page, value: string) {
  const input = searchBox(page);
  await input.click();
  await input.fill(value);
}

export async function waitForSuggestion(page: Page, name: string | RegExp) {
  await expect(page.getByRole("option", { name })).toBeVisible();
}

export async function openSettings(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: "Settings" }).click({ timeout: 10_000 });
  await expect(page.getByRole("region", { name: "Settings" })).toBeVisible();
}

export function userAlert(page: Page, text: string | RegExp) {
  return page.getByRole("alert").filter({ hasText: text });
}

export async function expectDashboard(page: Page) {
  await expect(page.getByRole("region", { name: "Current weather" })).toBeVisible();
}
