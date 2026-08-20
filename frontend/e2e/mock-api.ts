import type { Page, Request, Route } from "@playwright/test";
import type { WeatherResponse } from "../lib/types";
import { GEOCODE_NAIROBI, weatherPayload } from "./fixtures";

export type GeocodeBody = { results: unknown[] };

type WeatherHandler = (route: Route, request: Request) => Promise<void> | void;
type JsonHandler = (route: Route, request: Request) => Promise<void> | void;

export interface ApiMock {
  weatherRequests: Request[];
  geocodeRequests: Request[];
  setWeather: (handler: WeatherHandler) => void;
  setGeocode: (handler: JsonHandler) => void;
  weatherByLat: (table: Record<string, WeatherResponse>) => void;
  geocodeJson: (body: GeocodeBody, status?: number) => void;
  weatherJson: (body: WeatherResponse | ((req: Request) => WeatherResponse), status?: number, headers?: Record<string, string>) => void;
  weatherError: (status: number, error: string, message: string) => void;
}

function param(request: Request, name: string): string | null {
  return new URL(request.url()).searchParams.get(name);
}

/**
 * Intercept browser-facing /api/* so Playwright never reaches FastAPI.
 * Unmocked weather/geocode calls fail closed (503) instead of hanging.
 */
export async function installApiMock(page: Page): Promise<ApiMock> {
  const weatherRequests: Request[] = [];
  const geocodeRequests: Request[] = [];
  let weather: WeatherHandler = async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "backend_unavailable", message: "unmocked weather" }),
    });
  };
  let geocode: JsonHandler = async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "backend_unavailable", message: "unmocked geocode" }),
    });
  };

  await page.route("**/api/weather**", async (route) => {
    weatherRequests.push(route.request());
    await weather(route, route.request());
  });
  await page.route("**/api/geocode**", async (route) => {
    geocodeRequests.push(route.request());
    await geocode(route, route.request());
  });
  await page.route("**/api/reverse**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lat: 0, lon: 0, label: "Test place" }),
    });
  });
  await page.route("**/api/geolocate**", async (route) => {
    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: "not_found", message: "unavailable" }),
    });
  });

  const api: ApiMock = {
    weatherRequests,
    geocodeRequests,
    setWeather(handler) {
      weather = handler;
    },
    setGeocode(handler) {
      geocode = handler;
    },
    weatherByLat(table) {
      weather = async (route, request) => {
        const lat = param(request, "lat");
        const key = lat ? Number(lat).toFixed(4) : "";
        const body = table[key] ?? weatherPayload({ lat: Number(lat), lon: 0, temperature: 0, description: "Unknown" });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "x-cache": "MISS" },
          body: JSON.stringify(body),
        });
      };
    },
    geocodeJson(body, status = 200) {
      geocode = async (route) => {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(body),
        });
      };
    },
    weatherJson(body, status = 200, headers = { "x-cache": "MISS" }) {
      weather = async (route, request) => {
        const payload = typeof body === "function" ? body(request) : body;
        await route.fulfill({
          status,
          contentType: "application/json",
          headers,
          body: JSON.stringify(payload),
        });
      };
    },
    weatherError(status, error, message) {
      weather = async (route) => {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify({ error, message }),
        });
      };
    },
  };

  api.geocodeJson(GEOCODE_NAIROBI);
  return api;
}

export function weatherUrlHasNoBypass(url: string): boolean {
  const params = new URL(url, "http://127.0.0.1").searchParams;
  return (
    !params.has("refresh") &&
    !params.has("force") &&
    !params.has("no_cache") &&
    ![...params.keys()].some((key) => key.startsWith("_"))
  );
}
