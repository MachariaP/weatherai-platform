/**
 * Phase 3 test page.
 *
 * Proves the browser → Next.js Route Handler → FastAPI data boundary
 * works end-to-end. Deliberately minimal; the real dashboard is Phase 4.
 */
import styles from "./page.module.css";
import { fetchWeather } from "@/lib/api-client";

const TEST_COORDS = { lat: -1.2921, lon: 36.8219 }; // Nairobi

export default async function Home() {
  const result = await fetchWeather(TEST_COORDS);

  return (
    <main className={styles.main}>
      <h1>WeatherAI QA project</h1>
      <p>Phase 3: data boundary verification.</p>

      {result.ok ? (
        <>
          <p>
            Weather for {result.data.lat}, {result.data.lon} —{" "}
            <code>X-Cache: {result.cacheStatus ?? "none"}</code>
          </p>
          <p>
            Current: {result.data.current.temperature}°
            {result.data.units === "metric" ? "C" : "F"} —{" "}
            {result.data.current.weather_description}
          </p>
          <p>{result.data.daily.length} day(s) forecast loaded.</p>
          {result.data.ai_summary && (
            <p>
              <strong>AI:</strong> {result.data.ai_summary}
            </p>
          )}
          <details>
            <summary>Raw response</summary>
            <pre>{JSON.stringify(result.data, null, 2)}</pre>
          </details>
        </>
      ) : (
        <>
          <p>
            Error: <strong>{result.error.error}</strong>
          </p>
          <p>{result.error.message}</p>
        </>
      )}
    </main>
  );
}
