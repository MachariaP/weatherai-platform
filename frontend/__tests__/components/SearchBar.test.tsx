/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act, waitFor } from "@testing-library/react";
import { SearchBar } from "@/components/ui/SearchBar";
import { LocationProvider, useLocation } from "@/components/providers/LocationProvider";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

function Probe() {
  const { location, setLocation } = useLocation();
  return (
    <>
      {location ? <p>{`lat:${location.lat} lon:${location.lon}`}</p> : <p>no location</p>}
      <button
        type="button"
        onClick={() =>
          setLocation({ lat: -1.2921, lon: 36.8219, label: "1.29° S, 36.82° E" })
        }
      >
        Seed location
      </button>
    </>
  );
}

function renderSearch() {
  return render(
    <LocationProvider>
      <SearchBar />
      <Probe />
    </LocationProvider>
  );
}

function nairobiFetch(results: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ results }),
    })
  );
}

async function typeQuery(value: string) {
  fireEvent.change(screen.getByLabelText("Location or coordinates"), {
    target: { value },
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 350));
  });
}

describe("SearchBar", () => {
  it("geocodes a city name through /api/geocode suggestions", async () => {
    nairobiFetch([
      { lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya", country: "Kenya" },
      {
        lat: 41.7756,
        lon: -88.3806,
        label: "Nairobi, United States",
        region: "Illinois",
        country: "United States",
      },
    ]);
    renderSearch();
    await typeQuery("Nairobi");
    expect(screen.getByRole("option", { name: /Nairobi, Kenya/ })).toBeDefined();
    expect(screen.getByRole("option", { name: /Illinois/ })).toBeDefined();
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
    fireEvent.click(screen.getByRole("option", { name: /Nairobi, Kenya/ }));
    expect(screen.getByText("lat:-1.2864 lon:36.8172")).toBeDefined();
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/^\/api\/geocode\?q=Nairobi$/);
    expect(window.location.search).toContain("lat=-1.2864");
  });

  it("does not change the URL while the user is only typing", async () => {
    nairobiFetch([{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }]);
    renderSearch();
    await typeQuery("Nairobi");
    expect(screen.getByRole("option", { name: /Nairobi, Kenya/ })).toBeDefined();
    expect(window.location.search).toBe("");
  });

  it("shows no locations found without treating it as a crash", async () => {
    nairobiFetch([]);
    renderSearch();
    await typeQuery("zzzznotacity");
    expect(screen.getByText("No locations found")).toBeDefined();
    expect(screen.getByText("no location")).toBeDefined();
  });

  it("closes suggestions on Escape", async () => {
    nairobiFetch([{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }]);
    renderSearch();
    const input = screen.getByLabelText("Location or coordinates");
    fireEvent.change(input, { target: { value: "Nairobi" } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("debounces lookup so intermediate keystrokes do not each fire a request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          results: [{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);
    renderSearch();
    const input = screen.getByLabelText("Location or coordinates");
    fireEvent.change(input, { target: { value: "Nai" } });
    fireEvent.change(input, { target: { value: "Nairo" } });
    fireEvent.change(input, { target: { value: "Nairobi" } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/q=Nairobi$/);
  });

  it("lists recent locations without calling geocode", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSearch();
    fireEvent.click(screen.getByRole("button", { name: "Seed location" }));
    fireEvent.change(screen.getByLabelText("Location or coordinates"), {
      target: { value: "" },
    });
    fireEvent.focus(screen.getByLabelText("Location or coordinates"));
    expect(screen.getByText("Recent")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByText("Recent")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("selects a saved place without calling geocode", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    localStorage.setItem(
      "weatherai:favorite-locations",
      JSON.stringify([{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }])
    );
    renderSearch();
    fireEvent.focus(screen.getByLabelText("Location or coordinates"));
    await waitFor(() => expect(screen.getByText("Saved")).toBeDefined());
    fireEvent.click(screen.getByRole("option", { name: /Nairobi, Kenya/ }));
    expect(screen.getByText("lat:-1.2864 lon:36.8172")).toBeDefined();
    expect(window.location.search).toContain("lat=-1.2864");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not geocode when the query is already coordinates", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderSearch();
    await typeQuery("-1.2921, 36.8219");
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Get Weather" }));
    expect(screen.getByText("lat:-1.2921 lon:36.8219")).toBeDefined();
  });

  it("selects a highlighted suggestion with Enter", async () => {
    nairobiFetch([{ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }]);
    renderSearch();
    const input = screen.getByLabelText("Location or coordinates");
    fireEvent.change(input, { target: { value: "Nairobi" } });
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350));
    });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByText("lat:-1.2864 lon:36.8172")).toBeDefined();
  });
});
