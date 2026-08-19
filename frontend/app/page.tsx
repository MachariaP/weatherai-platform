/**
 * Phase 0 placeholder page.
 *
 * This deliberately does NOT call WeatherAI. It only proves the frontend
 * can reach our own backend's /health endpoint through a same-origin
 * server-side fetch. Real weather UI lands in later phases.
 */
import styles from "./page.module.css";

async function getBackendStatus(): Promise<{ ok: boolean; body?: unknown }> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL}/health`, {
      cache: "no-store",
    });
    return { ok: res.ok, body: await res.json() };
  } catch {
    return { ok: false };
  }
}

export default async function Home() {
  const backend = await getBackendStatus();

  return (
    <main className={styles.main}>
      <h1>WeatherAI QA project</h1>
      <p>Phase 0: foundation check.</p>
      <p>
        Backend status:{" "}
        <strong>{backend.ok ? "reachable" : "unreachable"}</strong>
      </p>
      {backend.ok && <pre>{JSON.stringify(backend.body, null, 2)}</pre>}
    </main>
  );
}
