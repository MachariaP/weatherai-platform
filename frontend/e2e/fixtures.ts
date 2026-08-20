import type { WeatherResponse } from "../lib/types";

/** Fake fixtures only — never live WeatherAI payloads or credentials. */

export const NAIROBI_KE = {
  lat: -1.2864,
  lon: 36.8172,
  label: "Nairobi, Kenya",
  country: "Kenya",
};

export const NAIROBI_IL = {
  lat: 41.7756,
  lon: -88.3806,
  label: "Nairobi, United States",
  region: "Illinois",
  country: "United States",
};

export const LONDON = {
  lat: 51.5074,
  lon: -0.1278,
  label: "London, United Kingdom",
};

export const GEOCODE_NAIROBI = {
  results: [NAIROBI_KE, NAIROBI_IL],
};

export function weatherPayload(
  overrides: Partial<WeatherResponse> & {
    lat: number;
    lon: number;
    place_name?: string | null;
    temperature?: number;
    description?: string;
    units?: "metric" | "imperial";
    ai_summary?: string | null;
  }
): WeatherResponse {
  const units = overrides.units ?? "metric";
  const temperature = overrides.temperature ?? 19.9;
  const description = overrides.description ?? "Overcast";
  const rest = { ...overrides };
  delete rest.temperature;
  delete rest.description;

  return {
    units,
    current: {
      temperature,
      wind_speed: 4,
      wind_direction: 111,
      weather_code: 3,
      weather_description: description,
      is_day: true,
      observed_at: "2026-08-20T10:45",
    },
    daily: [
      {
        date: "2026-08-21",
        temp_max: temperature + 4,
        temp_min: temperature - 6,
        precipitation: 2.4,
        weather_code: 61,
        weather_description: "Slight rain",
      },
      {
        date: "2026-08-22",
        temp_max: temperature + 2,
        temp_min: temperature - 5,
        precipitation: 0,
        weather_code: 1,
        weather_description: "Mainly clear",
      },
      {
        date: "2026-08-23",
        temp_max: temperature + 1,
        temp_min: temperature - 4,
        precipitation: null,
        weather_code: 3,
        weather_description: "Fog",
      },
    ],
    hourly: [
      {
        time: "2026-08-20T15:00",
        temperature,
        precipitation: 0.4,
        weather_code: 61,
        weather_description: "Slight rain",
      },
      {
        time: "2026-08-20T16:00",
        temperature: temperature + 1,
        precipitation: 0,
        weather_code: 1,
        weather_description: "Mainly clear",
      },
      {
        time: "2026-08-20T17:00",
        temperature: temperature + 2,
        precipitation: null,
        weather_code: 3,
        weather_description: "Fog",
      },
    ],
    ai_summary: null,
    ...rest,
    lat: overrides.lat,
    lon: overrides.lon,
  };
}

export const NAIROBI_WEATHER = weatherPayload({
  lat: NAIROBI_KE.lat,
  lon: NAIROBI_KE.lon,
  place_name: NAIROBI_KE.label,
  temperature: 19.9,
  description: "Overcast",
});

export const NAIROBI_IMPERIAL = weatherPayload({
  lat: NAIROBI_KE.lat,
  lon: NAIROBI_KE.lon,
  place_name: NAIROBI_KE.label,
  units: "imperial",
  temperature: 67.8,
  description: "Overcast",
});

export const ILLINOIS_WEATHER = weatherPayload({
  lat: NAIROBI_IL.lat,
  lon: NAIROBI_IL.lon,
  place_name: NAIROBI_IL.label,
  temperature: 8.1,
  description: "Light snow",
});

export const LONDON_WEATHER = weatherPayload({
  lat: LONDON.lat,
  lon: LONDON.lon,
  place_name: LONDON.label,
  temperature: 12.2,
  description: "Drizzle",
});

export const COORD_WEATHER = weatherPayload({
  lat: -1.2921,
  lon: 36.8219,
  place_name: "Nairobi, Kenya",
  temperature: 21.4,
  description: "Partly cloudy",
});
