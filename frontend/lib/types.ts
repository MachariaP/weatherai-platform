/**
 * TypeScript representation of our FastAPI public API contract.
 *
 * These types mirror what GET /weather returns from OUR backend,
 * NOT the raw WeatherAI upstream response.  The frontend should
 * never model or reference WeatherAI's internal response shape.
 *
 * LIMITATION: These types are manually kept in sync with the
 * backend's app/models.py WeatherResponse.  In a production
 * codebase, a schema-generation tool (e.g. openapi-typescript)
 * would automate this alignment.
 */

export interface CurrentWeather {
  temperature: number;
  wind_speed: number;
  wind_direction: number;
  weather_code: number;
  weather_description: string;
  is_day: boolean;
  observed_at: string | null;
  feels_like?: number | null;
  humidity?: number | null;
  uv_index?: number | null;
  pressure?: number | null;
  precip_last_24h?: number | null;
}

export interface ForecastDay {
  date: string;
  temp_max: number;
  temp_min: number;
  precipitation: number;
  weather_code: number;
  weather_description: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  precipitation: number;
  weather_code: number;
  weather_description: string;
}

export interface WeatherResponse {
  lat: number;
  lon: number;
  units: string;
  current: CurrentWeather;
  daily: ForecastDay[];
  hourly: HourlyForecast[];
  ai_summary: string | null;
  place_name?: string | null;
}

export interface GeocodeResult {
  lat: number;
  lon: number;
  label: string;
}

export interface WeatherError {
  error: string;
  message: string;
}

export interface WeatherParams {
  lat: number;
  lon: number;
  days?: number;
  ai?: boolean;
  units?: "metric" | "imperial";
  lang?: string;
}
