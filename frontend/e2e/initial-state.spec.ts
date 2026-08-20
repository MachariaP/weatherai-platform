import { expect, test } from "@playwright/test";
import { openHome, openSettings, searchBox } from "./actions";
import { installApiMock } from "./mock-api";

test.describe("initial application state", () => {
  test("loads empty dashboard chrome without weather", async ({ page }) => {
    const api = await installApiMock(page);
    await openHome(page);

    await expect(page.getByRole("link", { name: "WeatherAI home" })).toBeVisible();
    await expect(page.getByText("WeatherAI", { exact: true })).toBeVisible();
    await expect(searchBox(page)).toBeVisible();
    await expect(page.getByRole("button", { name: "Get Weather" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Use my location" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your weather, at a glance." })).toBeVisible();
    await expect(page.getByRole("region", { name: "Current weather" })).toHaveCount(0);
    expect(api.weatherRequests).toHaveLength(0);

    await openSettings(page);
    await expect(page.getByRole("group", { name: "Temperature units" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "AI insights" })).toBeVisible();
    await expect(page.getByRole("switch", { name: "AI insights" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    await expect(page.getByRole("group", { name: "Forecast range" })).toBeVisible();
    await expect(page.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true");
  });
});
