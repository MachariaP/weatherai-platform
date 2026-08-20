import { expect, test } from "@playwright/test";
import { expectDashboard, openHome, openSettings, searchBox, typePlace, waitForSuggestion } from "./actions";
import { GEOCODE_NAIROBI, NAIROBI_KE, NAIROBI_WEATHER, weatherPayload } from "./fixtures";
import { installApiMock } from "./mock-api";

const MOMBASA = {
  lat: -4.0435,
  lon: 39.6682,
  label: "Mombasa, Kenya",
};

const NAIROBI_EXPLORATION = weatherPayload({
  lat: NAIROBI_KE.lat,
  lon: NAIROBI_KE.lon,
  place_name: NAIROBI_KE.label,
  temperature: 19.9,
  description: "Overcast",
  daily: [
    {
      date: "2026-08-20",
      temp_max: 24,
      temp_min: 14,
      precipitation: 0,
      weather_code: 3,
      weather_description: "Overcast",
    },
    {
      date: "2026-08-21",
      temp_max: 23,
      temp_min: 13,
      precipitation: 2.4,
      weather_code: 61,
      weather_description: "Slight rain",
    },
    {
      date: "2026-08-22",
      temp_max: 22,
      temp_min: 12,
      precipitation: null,
      weather_code: 1,
      weather_description: "Mainly clear",
    },
  ],
  hourly: [
    {
      time: "2026-08-20T15:00",
      temperature: 19.9,
      precipitation: 0.4,
      weather_code: 61,
      weather_description: "Slight rain",
    },
    {
      time: "2026-08-20T16:00",
      temperature: 20.9,
      precipitation: 0,
      weather_code: 1,
      weather_description: "Mainly clear",
    },
    {
      time: "2026-08-21T09:00",
      temperature: 18,
      precipitation: 1.1,
      weather_code: 61,
      weather_description: "Slight rain",
    },
  ],
});

const MOMBASA_WEATHER = weatherPayload({
  lat: MOMBASA.lat,
  lon: MOMBASA.lon,
  place_name: MOMBASA.label,
  temperature: 28.4,
  description: "Clear",
});

test.describe("advanced weather exploration", () => {
  test("hourly chart, forecast drill-down, and location switcher", async ({ page }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson(NAIROBI_EXPLORATION);
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);

    const chart = page.getByRole("region", { name: "Hourly evolution" });
    await expect(chart).toBeVisible();
    await expect(chart.getByRole("radio", { name: "Temperature" })).toBeVisible();
    await chart.getByRole("radio", { name: "Precipitation" }).click();
    await expect(chart.getByRole("radio", { name: "Precipitation" })).toHaveAttribute(
      "aria-checked",
      "true"
    );

    await page.getByRole("button", { name: /Slight rain, high/ }).click();
    const dayDialog = page.getByRole("dialog");
    await expect(dayDialog).toBeVisible();
    await expect(dayDialog.getByRole("region", { name: "Hourly evolution" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dayDialog).toHaveCount(0);

    await searchBox(page).click();
    await expect(page.getByText("Actions")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enter coordinates" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Use my location" }).last()).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("compare fetches only the two chosen favorites without AI", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherByLat({
      [NAIROBI_KE.lat.toFixed(4)]: NAIROBI_WEATHER,
      [MOMBASA.lat.toFixed(4)]: MOMBASA_WEATHER,
    });
    await page.addInitScript(
      ({ favorites }) => {
        const marker = "e2e:storage-ready";
        if (!sessionStorage.getItem(marker)) {
          localStorage.clear();
          sessionStorage.setItem(marker, "1");
        }
        localStorage.setItem("weatherai:favorite-locations", JSON.stringify(favorites));
      },
      {
        favorites: [
          { lat: NAIROBI_KE.lat, lon: NAIROBI_KE.lon, label: NAIROBI_KE.label },
          { lat: MOMBASA.lat, lon: MOMBASA.lon, label: MOMBASA.label },
          { lat: -0.0917, lon: 34.768, label: "Kisumu, Kenya" },
        ],
      }
    );
    await page.goto("/");

    expect(api.weatherRequests).toHaveLength(0);
    await openSettings(page);
    await page.getByRole("button", { name: "Compare saved places" }).click();
    await expect(page.getByRole("heading", { name: "Compare places" })).toBeVisible();
    expect(api.weatherRequests).toHaveLength(0);

    await page.getByRole("button", { name: "Nairobi, Kenya" }).click();
    await page.getByRole("button", { name: "Mombasa, Kenya" }).click();
    await expect(page.getByRole("heading", { name: "Nairobi, Kenya" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mombasa, Kenya" })).toBeVisible();

    expect(api.weatherRequests).toHaveLength(2);
    expect(api.weatherRequests.every((req) => !req.url().includes("ai=true"))).toBe(true);
    expect(api.weatherRequests.some((req) => req.url().includes("lat=-0.0917"))).toBe(false);
  });
});
