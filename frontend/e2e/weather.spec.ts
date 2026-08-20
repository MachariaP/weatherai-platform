import { expect, test } from "@playwright/test";
import { expectDashboard, openHome, openSettings, searchBox, typePlace, userAlert, waitForSuggestion } from "./actions";
import {
  GEOCODE_NAIROBI,
  LONDON,
  LONDON_WEATHER,
  NAIROBI_IMPERIAL,
  NAIROBI_KE,
  NAIROBI_WEATHER,
} from "./fixtures";
import { installApiMock, weatherUrlHasNoBypass } from "./mock-api";

test.describe("weather preferences and refresh", () => {
  test("unit switch requests imperial weather and replaces metric values", async ({ page }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.setWeather(async (route, request) => {
      const units = new URL(request.url()).searchParams.get("units");
      const body = units === "imperial" ? NAIROBI_IMPERIAL : NAIROBI_WEATHER;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-cache": "MISS" },
        body: JSON.stringify(body),
      });
    });
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);
    await expect(page.getByRole("region", { name: "Current weather" }).getByText("20°")).toBeVisible();
    await expect(page.getByText("°C")).toBeVisible();

    await openSettings(page);
    await page.getByRole("button", { name: "Fahrenheit" }).click();
    await page.getByRole("banner").getByRole("button", { name: "Dashboard" }).click();

    await expect(page.getByRole("region", { name: "Current weather" }).getByText("68°")).toBeVisible();
    await expect(page.getByText("°F")).toBeVisible();
    await expect(page.getByText("20°")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Nairobi, Kenya" })).toBeVisible();
    expect(api.weatherRequests.some((req) => req.url().includes("units=imperial"))).toBe(true);
  });

  test("AI stays off until enabled and does not invent a summary", async ({ page }) => {
    const api = await installApiMock(page);
    api.geocodeJson(GEOCODE_NAIROBI);
    api.weatherJson((request) => {
      const ai = new URL(request.url()).searchParams.get("ai");
      return {
        ...NAIROBI_WEATHER,
        ai_summary: ai === "true" ? null : null,
      };
    });
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expectDashboard(page);

    const first = api.weatherRequests[0].url();
    expect(first).not.toContain("ai=true");
    await expect(page.getByRole("region", { name: "AI weather insight" })).toHaveCount(0);

    await openSettings(page);
    await page.getByRole("switch", { name: "AI insights" }).click();
    await page.getByRole("banner").getByRole("button", { name: "Dashboard" }).click();

    await expect(page.getByText("No AI summary is available for this location.")).toBeVisible();
    expect(api.weatherRequests.some((req) => req.url().includes("ai=true"))).toBe(true);
  });

  test("forecast precipitation amounts are honest about zero and missing", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherJson(NAIROBI_WEATHER);
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);
    await expectDashboard(page);

    const daily = page.getByRole("region", { name: "7-day forecast" });
    await expect(daily.getByText("2 mm")).toBeVisible();
    await expect(daily.getByText("0 mm")).toBeVisible();
    const fogDay = page.getByRole("article", { name: /Fog/ });
    await expect(fogDay).toBeVisible();
    await expect(fogDay.getByText("0 mm")).toHaveCount(0);

    const hourly = page.getByRole("region", { name: "Hourly forecast" });
    await expect(hourly.getByText("0.4 mm")).toBeVisible();
    await expect(hourly.getByText("0 mm")).toBeVisible();
    await expect(daily).not.toContainText("%");
    await expect(hourly).not.toContainText("%");
    await expect(page.getByText(/chance of rain/i)).toHaveCount(0);
  });

  test("manual refresh keeps weather visible and does not bypass the cache", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    let calls = 0;
    api.setWeather(async (route) => {
      calls += 1;
      if (calls === 2) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "x-cache": "HIT" },
          body: JSON.stringify({
            ...NAIROBI_WEATHER,
            current: {
              ...NAIROBI_WEATHER.current,
              temperature: 22.4,
              weather_description: "Thunderstorm",
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-cache": "MISS" },
        body: JSON.stringify(NAIROBI_WEATHER),
      });
    });
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);
    await expect(page.getByText("Overcast")).toBeVisible();

    await page.getByRole("button", { name: "Refresh" }).click();
    await expect(page.getByRole("button", { name: "Refreshing" })).toBeVisible();
    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page.getByRole("region", { name: "Loading current weather" })).toHaveCount(0);

    await expect(page.getByRole("region", { name: "Current weather" }).getByText("Thunderstorm")).toBeVisible();
    await expect(page.getByText("Cached")).toBeVisible();
    expect(api.weatherRequests).toHaveLength(2);
    for (const req of api.weatherRequests) {
      expect(weatherUrlHasNoBypass(req.url())).toBe(true);
    }
  });

  test("failed refresh keeps the previous weather and shows a non-destructive error", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    let calls = 0;
    api.setWeather(async (route) => {
      calls += 1;
      if (calls === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "x-cache": "MISS" },
          body: JSON.stringify(NAIROBI_WEATHER),
        });
        return;
      }
      await route.fulfill({
        status: 502,
        contentType: "application/json",
        body: JSON.stringify({
          error: "upstream_error",
          message: "Weather service temporarily unavailable",
        }),
      });
    });
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);
    await expect(page.getByText("Overcast")).toBeVisible();
    await page.getByRole("button", { name: "Refresh" }).click();

    await expect(userAlert(page, "Weather unavailable")).toBeVisible();
    await expect(page.getByText("Overcast")).toBeVisible();
    await expect(page.getByRole("region", { name: "Current weather" })).toBeVisible();
    await expect(searchBox(page)).toBeVisible();
  });

  test("location change clears previous weather before the next payload arrives", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    let releaseLondon!: () => void;
    const londonGate = new Promise<void>((resolve) => {
      releaseLondon = resolve;
    });
    api.setGeocode(async (route, request) => {
      const q = new URL(request.url()).searchParams.get("q") ?? "";
      const body = q.toLowerCase().includes("london")
        ? { results: [LONDON] }
        : GEOCODE_NAIROBI;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    api.setWeather(async (route, request) => {
      const lat = Number(new URL(request.url()).searchParams.get("lat"));
      if (lat.toFixed(4) === LONDON.lat.toFixed(4)) {
        await londonGate;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "x-cache": "MISS" },
          body: JSON.stringify(LONDON_WEATHER),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-cache": "MISS" },
        body: JSON.stringify(NAIROBI_WEATHER),
      });
    });
    await openHome(page);
    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await expect(page.getByText("Overcast")).toBeVisible();

    await typePlace(page, "London");
    await waitForSuggestion(page, /London, United Kingdom/);
    await page.getByRole("option", { name: /London, United Kingdom/ }).click();

    await expect(page.getByText("Overcast")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Loading current weather" })).toBeVisible();
    releaseLondon();
    await expect(page.getByText("Drizzle")).toBeVisible();
    await expect(page.getByRole("heading", { name: "London, United Kingdom" })).toBeVisible();
  });

  test("an older delayed weather response does not overwrite the latest location", async ({
    page,
  }) => {
    const api = await installApiMock(page);
    let releaseNairobi!: () => void;
    const nairobiGate = new Promise<void>((resolve) => {
      releaseNairobi = resolve;
    });
    api.setGeocode(async (route, request) => {
      const q = new URL(request.url()).searchParams.get("q") ?? "";
      const body = q.toLowerCase().includes("london")
        ? { results: [LONDON] }
        : GEOCODE_NAIROBI;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
    api.setWeather(async (route, request) => {
      const lat = Number(new URL(request.url()).searchParams.get("lat"));
      const send = async (body: typeof NAIROBI_WEATHER) => {
        try {
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: { "x-cache": "MISS" },
            body: JSON.stringify(body),
          });
        } catch {
          /* request was aborted after a newer location was selected */
        }
      };
      if (lat.toFixed(4) === NAIROBI_KE.lat.toFixed(4)) {
        await nairobiGate;
        await send(NAIROBI_WEATHER);
        return;
      }
      await send(LONDON_WEATHER);
    });
    await openHome(page);

    await typePlace(page, "Nairobi");
    await waitForSuggestion(page, /Nairobi, Kenya/);
    await page.getByRole("option", { name: /Nairobi, Kenya/ }).click();
    await typePlace(page, "London");
    await waitForSuggestion(page, /London, United Kingdom/);
    await page.getByRole("option", { name: /London, United Kingdom/ }).click();
    await expect(page.getByText("Drizzle")).toBeVisible();

    releaseNairobi();
    await page.waitForTimeout(200);
    await expect(page.getByText("Drizzle")).toBeVisible();
    await expect(page.getByText("Overcast")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "London, United Kingdom" })).toBeVisible();
  });

  test("503 weather errors stay user-safe and remain navigable", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherError(503, "backend_unavailable", "ECONNREFUSED at /home/app/server.py");
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);

    await expect(userAlert(page, "Weather unavailable")).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
    await expect(page.getByText("ECONNREFUSED")).toHaveCount(0);
    await expect(page.getByText("/home/app")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "WeatherAI home" })).toBeVisible();
    await expect(searchBox(page)).toBeEnabled();
  });

  test("504 timeout UI does not wait for a real timeout", async ({ page }) => {
    const api = await installApiMock(page);
    api.weatherError(504, "backend_timeout", "Backend did not respond in time");
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);

    await expect(page.getByText("Request timed out")).toBeVisible();
    await expect(page.getByText(/too long/i)).toBeVisible();
    await expect(page.getByText("Backend did not respond in time")).toHaveCount(0);
  });

  test("switching forecast range requests days=3 and renders returned days", async ({ page }) => {
    const api = await installApiMock(page);
    api.setWeather(async (route, request) => {
      const days = Number(new URL(request.url()).searchParams.get("days") ?? "7");
      const count = days === 3 ? 3 : 7;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "x-cache": "MISS" },
        body: JSON.stringify({
          ...NAIROBI_WEATHER,
          daily: Array.from({ length: count }, (_, i) => ({
            date: `2026-08-${String(21 + i).padStart(2, "0")}`,
            temp_max: 24,
            temp_min: 14,
            precipitation: 0,
            weather_code: 1,
            weather_description: `Range day ${i + 1}`,
          })),
        }),
      });
    });
    await openHome(page, `/?lat=${NAIROBI_KE.lat}&lon=${NAIROBI_KE.lon}`);
    await expectDashboard(page);
    await expect(page.getByRole("region", { name: "7-day forecast" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "7-day forecast" }).getByRole("listitem")
    ).toHaveCount(7);
    expect(api.weatherRequests[0].url()).toContain("days=7");

    await page.getByRole("button", { name: "3 days" }).click();
    await expect(page.getByRole("region", { name: "3-day forecast" })).toBeVisible();
    await expect(
      page.getByRole("region", { name: "3-day forecast" }).getByRole("listitem")
    ).toHaveCount(3);
    await expect(page.getByRole("heading", { name: "Nairobi, Kenya" })).toBeVisible();
    expect(api.weatherRequests.some((req) => req.url().includes("days=3"))).toBe(true);
    expect(api.weatherRequests.at(-1)?.url()).toContain("units=metric");
    expect(api.weatherRequests.at(-1)?.url()).not.toContain("ai=true");
  });
});
