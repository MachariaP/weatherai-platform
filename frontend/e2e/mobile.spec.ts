import { expect, test } from "@playwright/test";
import { expectDashboard, openHome, searchBox, typePlace, waitForSuggestion } from "./actions";
import { GEOCODE_NAIROBI, NAIROBI_KE, NAIROBI_WEATHER } from "./fixtures";
import { installApiMock } from "./mock-api";

test.describe("mobile smoke", () => {
  test("search, select a suggestion, and keep the hourly strip on-canvas", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
    });
    await openHome(page);

    await expect(page.getByRole("link", { name: "WeatherAI home" })).toBeVisible();
    await expect(searchBox(page)).toBeVisible();
    await expect(page.getByLabel("Latitude")).toBeVisible();

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();

    await expectDashboard(page);
    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page.getByRole("region", { name: "Hourly forecast" })).toBeVisible();

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth - window.innerWidth;
    });
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
