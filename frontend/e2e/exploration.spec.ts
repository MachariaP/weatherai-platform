import { expect, test } from "@playwright/test";
import { expectDashboard, openHome, openSettings, searchBox, typePlace, waitForSuggestion } from "./actions";
import { GEOCODE_NAIROBI, NAIROBI_KE, NAIROBI_WEATHER, weatherPayload } from "./fixtures";
import { installApiMock } from "./mock-api";

const MOMBASA = {
  lat: -4.0435,
  lon: 39.6682,
  label: "Mombasa, Kenya",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function hourlySeries(startUtc: Date, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(startUtc.getTime() + i * 60 * 60 * 1000);
    return {
      time: `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())}T${pad(at.getUTCHours())}:00`,
      temperature: 17 + (i % 4),
      precipitation: i === 1 ? 1.1 : 0,
      weather_code: i === 1 ? 61 : 3,
      weather_description: i === 1 ? "Slight rain" : "Overcast",
    };
  });
}

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

const NAIROBI_NEXT24 = weatherPayload({
  lat: NAIROBI_KE.lat,
  lon: NAIROBI_KE.lon,
  place_name: NAIROBI_KE.label,
  temperature: 18,
  description: "Overcast",
  current: {
    temperature: 18,
    wind_speed: 4,
    wind_direction: 111,
    weather_code: 3,
    weather_description: "Overcast",
    is_day: true,
    observed_at: "2026-08-21T09:45",
  },
  hourly: hourlySeries(new Date("2026-08-21T09:00:00Z"), 24),
});

const MOMBASA_WEATHER = weatherPayload({
  lat: MOMBASA.lat,
  lon: MOMBASA.lon,
  place_name: MOMBASA.label,
  temperature: 28.4,
  description: "Clear",
});

async function freezeUtc(page: Parameters<typeof openHome>[0], iso: string) {
  await page.clock.setFixedTime(new Date(iso));
}

test.describe("advanced weather exploration", () => {
  test("hourly chart, forecast drill-down, and location switcher", async ({ page }) => {
    await freezeUtc(page, "2026-08-20T15:30:00Z");
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

  test("timeline scrubber stays in sync with the hourly strip", async ({ page }) => {
    await freezeUtc(page, "2026-08-20T15:30:00Z");
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson(NAIROBI_EXPLORATION);
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);

    const slider = page.getByRole("slider", { name: "Hourly weather timeline" });
    await expect(slider).toBeVisible();
    const strip = page.getByRole("list", { name: "Hourly forecast times" });
    await strip.getByRole("button").nth(1).click();
    await expect(page.getByRole("status").filter({ hasText: /Forecast at 16:00/ })).toBeVisible();
    await expect(strip.getByRole("button").nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(slider).toHaveAttribute("aria-valuenow", "1");
  });

  test("observed time, next 24 hours heading, and tomorrow end cap", async ({ page }) => {
    await freezeUtc(page, "2026-08-21T09:30:00Z");
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson(NAIROBI_NEXT24);
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);

    await expect(page.getByText("Observed 09:45")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next 24 hours" })).toBeVisible();
    await expect(page.getByText("Tomorrow 08:00", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "Current weather" })).toContainText("18°");
    await expect(page.getByRole("region", { name: "Hourly forecast" })).toContainText("17°");
    await expect(page.getByTestId("hourly-scroll-fade-right")).toBeVisible();

    const nowX = await page.getByTestId("chart-now-marker").getAttribute("x1");
    const slider = page.getByRole("slider", { name: "Hourly weather timeline" });
    await slider.fill("5");
    await expect(page.getByRole("status").filter({ hasText: /Forecast at 14:00/ })).toBeVisible();
    await expect(page.getByText("Observed 09:45")).toBeVisible();
    await expect(page.getByTestId("chart-now-marker")).toHaveAttribute("x1", nowX ?? "");
    await expect(page.getByTestId("chart-selected-marker")).toHaveCount(1);
    const selectedX = await page.getByTestId("chart-selected-marker").getAttribute("x1");
    expect(selectedX).not.toBe(nowX);

    const strip = page.getByRole("list", { name: "Hourly forecast times" });
    await expect(strip.getByRole("button").nth(5)).toHaveAttribute("aria-pressed", "true");
  });

  test("mobile next-24 timeline stays on canvas", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await freezeUtc(page, "2026-08-21T09:30:00Z");
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson(NAIROBI_NEXT24);
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);

    await expect(page.getByRole("heading", { name: "Next 24 hours" })).toBeVisible();
    await expect(page.getByText("08:00 +1d")).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test("reduced-motion still loads the dashboard", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await freezeUtc(page, "2026-08-20T15:30:00Z");
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson(NAIROBI_EXPLORATION);
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);
    await expect(page.getByRole("region", { name: "Current weather" })).toBeVisible();
    await expect(page.getByRole("slider", { name: "Hourly weather timeline" })).toBeVisible();
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
