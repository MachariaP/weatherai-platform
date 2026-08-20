import { expect, test } from "@playwright/test";
import { expectDashboard, openHome, searchBox, typePlace, userAlert, waitForSuggestion } from "./actions";
import {
  COORD_WEATHER,
  GEOCODE_NAIROBI,
  ILLINOIS_WEATHER,
  NAIROBI_IL,
  NAIROBI_KE,
  NAIROBI_WEATHER,
} from "./fixtures";
import { installApiMock } from "./mock-api";

test.describe("location discovery", () => {
  test("city search suggestions update the canonical URL and weather", async ({ page }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await expect(page.getByRole("option", { name: /Illinois/ })).toBeVisible();
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();

    await expectDashboard(page);
    await expect(page.getByRole("heading", { name: "Nairobi, Kenya" })).toBeVisible();
    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2864/);
    await expect(page).toHaveURL(/lon=36\.8172/);

    expect(api.geocodeRequests.some((req) => req.url().includes("q=Nairobi"))).toBe(true);
    expect(api.weatherRequests.some((req) => req.url().includes("lat=-1.2864"))).toBe(true);
    expect(api.weatherRequests.some((req) => /photon|weather-ai|ipwho/i.test(req.url()))).toBe(
      false
    );

    await searchBox(page).fill("");
    await searchBox(page).focus();
    await expect(page.getByRole("listbox", { name: "Recent locations" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Nairobi, Kenya" })).toBeVisible();
  });

  test("keyboard selection uses the highlighted candidate, not the first hit", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
      [NAIROBI_IL.lat.toFixed(4)]: ILLINOIS_WEATHER,
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await searchBox(page).press("ArrowDown");
    await searchBox(page).press("Enter");

    await expect(page.getByRole("heading", { name: "Nairobi, United States" })).toBeVisible();
    await expect(page.getByText("Light snow")).toBeVisible();
    await expect(page.getByText("Overcast")).toHaveCount(0);
    await expect(page).toHaveURL(/lat=41\.7756/);
    expect(api.weatherRequests.some((req) => req.url().includes("lat=41.7756"))).toBe(true);
    expect(api.weatherRequests.some((req) => req.url().includes("lat=-1.2864"))).toBe(false);
  });

  test("no-results search does not fetch weather or replace a selected location", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    api.setGeocode(async (route, request) => {
      const q = new URL(request.url()).searchParams.get("q") ?? "";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(q.toLowerCase().includes("zzzz") ? { results: [] } : GEOCODE_NAIROBI),
      });
    });
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expect(page.getByText("Overcast")).toBeVisible();
    const weatherCount = api.weatherRequests.length;

    await typePlace(page, "zzzznotacity");
    await expect(page.getByText("No locations found")).toBeVisible();
    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2864/);
    expect(api.weatherRequests.length).toBe(weatherCount);
  });

  test("geocode failure shows a safe error without provider URLs", async ({ page }) => {
    const api = await installApiMock(page);
    const leakedHost = ["photon", "komoot", "io"].join(".");
    api.setGeocode(async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "backend_unavailable",
          message: `https://${leakedHost} exploded at /usr/src/app`,
        }),
      });
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await expect(userAlert(page, "Location search is unavailable")).toBeVisible();
    await expect(page.getByText(leakedHost)).toHaveCount(0);
    await expect(page.getByText("/usr/src")).toHaveCount(0);
    expect(api.weatherRequests).toHaveLength(0);
    await expect(searchBox(page)).toBeEnabled();
  });

  test("coordinate search loads weather from lat/lon without geocoding", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherJson(COORD_WEATHER);
    await openHome(page);

    await typePlace(page, "-1.2921, 36.8219");
    await page.getByRole("button", { name: "Get Weather" }).click();

    await expectDashboard(page);
    await expect(page.getByText("Partly cloudy")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2921/);
    await expect(page).toHaveURL(/lon=36\.8219/);
    expect(api.geocodeRequests).toHaveLength(0);
    expect(api.weatherRequests.some((req) => req.url().includes("lat=-1.2921"))).toBe(true);
  });

  test("invalid typed coordinates stay on the empty state", async ({ page }) => {
    const api = await installApiMock(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openHome(page);

    await page.getByLabel("Latitude").fill("999");
    await page.getByLabel("Longitude").fill("36.8219");
    await page.getByRole("button", { name: "Get Weather" }).click();

    await expect(userAlert(page, /Latitude must be a number between -90 and 90/)).toBeVisible();
    await expect(page.getByRole("region", { name: "Current weather" })).toHaveCount(0);
    await expect(page).toHaveURL(/^http:\/\/127\.0\.0\.1:\d+\/$/);
    expect(api.weatherRequests).toHaveLength(0);
  });

  test("shareable lat/lon URL hydrates weather and survives reload", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherJson(COORD_WEATHER);
    await openHome(page, "/?lat=-1.2921&lon=36.8219");

    await expectDashboard(page);
    await expect(page.getByText("Partly cloudy")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2921/);
    await expect(page).toHaveURL(/lon=36\.8219/);

    await page.reload();
    await expectDashboard(page);
    await expect(page.getByText("Partly cloudy")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2921/);
    expect(api.weatherRequests.length).toBeGreaterThanOrEqual(2);
  });

  test("invalid shareable URL does not fetch weather", async ({ page }) => {
    const api = await installApiMock(page);
    await openHome(page, "/?lat=999&lon=36.8219");

    await expect(userAlert(page, "Invalid coordinates in the link")).toBeVisible();
    await expect(page.getByRole("region", { name: "Current weather" })).toHaveCount(0);
    expect(api.weatherRequests).toHaveLength(0);
  });

  test("recent locations restore stored coordinates without geocoding again", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
      [NAIROBI_IL.lat.toFixed(4)]: ILLINOIS_WEATHER,
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expect(page.getByText("Overcast")).toBeVisible();

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Illinois/);
    await page.getByRole("option", { name: /Illinois/ }).click();
    await expect(page.getByText("Light snow")).toBeVisible();

    const geocodeCount = api.geocodeRequests.length;
    await page.reload();
    await expect(page.getByText("Light snow")).toBeVisible();

    await searchBox(page).fill("");
    await searchBox(page).focus();
    await expect(page.getByRole("option", { name: "Nairobi, Kenya" })).toBeVisible();
    await page.getByRole("option", { name: "Nairobi, Kenya" }).click();

    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page).toHaveURL(/lat=-1\.2864/);
    expect(api.geocodeRequests.length).toBe(geocodeCount);
    expect(
      api.weatherRequests.filter((req) => req.url().includes("lat=-1.2864")).length
    ).toBeGreaterThanOrEqual(2);
  });
});
