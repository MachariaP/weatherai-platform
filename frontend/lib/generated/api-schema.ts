/**
 * THIS FILE IS GENERATED.
 * DO NOT EDIT MANUALLY.
 *
 * Source: FastAPI public OpenAPI (backend/scripts/export_openapi.py).
 * Regenerate: npm run generate:api-types
 */

export interface paths {
    "/geocode": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Geocode */
        get: operations["geocode_geocode_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/geolocate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Geolocate */
        get: operations["geolocate_geolocate_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Health
         * @description Liveness check for this service only.
         *
         *     Deliberately does not call WeatherAI or any external dependency —
         *     this endpoint answers "is our process up", not "is WeatherAI up".
         *     Those are different questions and get different checks.
         */
        get: operations["health_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reverse": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Reverse */
        get: operations["reverse_reverse_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/weather": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Weather */
        get: operations["get_weather_weather_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * ApiError
         * @description Public error body used by FastAPI JSON error responses.
         */
        ApiError: {
            /** Error */
            error: string;
            /** Message */
            message: string;
        };
        /** CurrentWeather */
        CurrentWeather: {
            /** Feels Like */
            feels_like?: number | null;
            /** Humidity */
            humidity?: number | null;
            /** Is Day */
            is_day: boolean;
            /** Observed At */
            observed_at?: string | null;
            /** Precip Last 24H */
            precip_last_24h?: number | null;
            /** Pressure */
            pressure?: number | null;
            /** Temperature */
            temperature: number;
            /** Uv Index */
            uv_index?: number | null;
            /** Weather Code */
            weather_code: number;
            /** Weather Description */
            weather_description: string;
            /** Wind Direction */
            wind_direction: number;
            /** Wind Speed */
            wind_speed: number;
        };
        /** ForecastDay */
        ForecastDay: {
            /** Date */
            date: string;
            /**
             * Precipitation
             * @description Amount in the response units (mm metric, in imperial), not probability. 0 is verified zero; null is unavailable.
             */
            precipitation: number | null;
            /** Temp Max */
            temp_max: number;
            /** Temp Min */
            temp_min: number;
            /** Weather Code */
            weather_code: number;
            /** Weather Description */
            weather_description: string;
        };
        /**
         * GeocodeResult
         * @description One place candidate. Optional region/country are omitted when unknown.
         */
        GeocodeResult: {
            /** Country */
            country?: string | null;
            /** Label */
            label: string;
            /** Lat */
            lat: number;
            /** Lon */
            lon: number;
            /** Region */
            region?: string | null;
        };
        /** GeocodeSearchResponse */
        GeocodeSearchResponse: {
            /** Results */
            results: components["schemas"]["GeocodeResult"][];
        };
        /** HealthResponse */
        HealthResponse: {
            /** Service */
            service: string;
            /** Status */
            status: string;
        };
        /** HourlyForecast */
        HourlyForecast: {
            /**
             * Precipitation
             * @description Amount in the response units (mm metric, in imperial), not probability. 0 is verified zero; null is unavailable.
             */
            precipitation: number | null;
            /** Temperature */
            temperature: number;
            /** Time */
            time: string;
            /** Weather Code */
            weather_code: number;
            /** Weather Description */
            weather_description: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
        };
        /**
         * WeatherResponse
         * @description Our public API response — decoupled from upstream shape.
         */
        WeatherResponse: {
            /** Ai Summary */
            ai_summary: string | null;
            current: components["schemas"]["CurrentWeather"];
            /** Daily */
            daily: components["schemas"]["ForecastDay"][];
            /** Hourly */
            hourly: components["schemas"]["HourlyForecast"][];
            /** Lat */
            lat: number;
            /** Lon */
            lon: number;
            /** Place Name */
            place_name?: string | null;
            /** Units */
            units: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    geocode_geocode_get: {
        parameters: {
            query: {
                q: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeocodeSearchResponse"];
                };
            };
            /** @description Bad request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Location service unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Upstream timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    geolocate_geolocate_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeocodeResult"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Location service unavailable */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Upstream timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
    health_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    reverse_reverse_get: {
        parameters: {
            query: {
                lat: number;
                lon: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GeocodeResult"];
                };
            };
            /** @description Not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_weather_weather_get: {
        parameters: {
            query: {
                ai?: boolean;
                days?: number;
                lang?: string;
                lat: number;
                lon: number;
                units?: "metric" | "imperial";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    /** @description HIT when served from the FastAPI weather cache, otherwise MISS */
                    "X-Cache"?: "HIT" | "MISS";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["WeatherResponse"];
                };
            };
            /** @description Bad request */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Plan restriction */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
            /** @description Rate limit */
            429: {
                headers: {
                    /** @description Unix epoch when the upstream quota resets, if known */
                    "X-RateLimit-Reset"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Upstream or processing error */
            502: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
            /** @description Upstream timeout */
            504: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiError"];
                };
            };
        };
    };
}
