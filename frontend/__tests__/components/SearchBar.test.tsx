/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SearchBar } from "@/components/ui/SearchBar";
import { LocationProvider, useLocation } from "@/components/providers/LocationProvider";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Probe() {
  const { location } = useLocation();
  return location ? (
    <p>{`lat:${location.lat} lon:${location.lon}`}</p>
  ) : (
    <p>no location</p>
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

function fillAndSubmit(lat: string, lon: string) {
  fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: lat } });
  fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: lon } });
  fireEvent.submit(screen.getByRole("form", { name: "Search location" }));
}

describe("SearchBar", () => {
  it("accepts valid coordinates and sets location", () => {
    renderSearch();
    fillAndSubmit("-1.2921", "36.8219");
    expect(screen.getByText("lat:-1.2921 lon:36.8219")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects missing coordinates before setting location", () => {
    renderSearch();
    fillAndSubmit("", "");
    expect(screen.getByRole("alert").textContent).toMatch(/place name or coordinates/i);
    expect(screen.getByText("no location")).toBeDefined();
  });

  it("rejects invalid latitude", () => {
    renderSearch();
    fillAndSubmit("91", "0");
    expect(screen.getByRole("alert").textContent).toMatch(/latitude/i);
    expect(screen.getByText("no location")).toBeDefined();
  });

  it("rejects invalid longitude", () => {
    renderSearch();
    fillAndSubmit("0", "181");
    expect(screen.getByRole("alert").textContent).toMatch(/longitude/i);
    expect(screen.getByText("no location")).toBeDefined();
  });

  it("rejects non-numeric coordinates", () => {
    renderSearch();
    fillAndSubmit("abc", "xyz");
    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByText("no location")).toBeDefined();
  });

  it("submits from the Get Weather button", () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /get weather/i }));
    expect(screen.getByText("lat:0 lon:0")).toBeDefined();
  });

  it("parses a combined lat, lon query", () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText("Location or coordinates"), {
      target: { value: "-1.2921, 36.8219" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Search location" }));
    expect(screen.getByText("lat:-1.2921 lon:36.8219")).toBeDefined();
  });

  it("geocodes a city name through /api/geocode", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ lat: -1.2864, lon: 36.8172, label: "Nairobi, Kenya" }),
      })
    );
    renderSearch();
    fireEvent.change(screen.getByLabelText("Location or coordinates"), {
      target: { value: "Nairobi" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Search location" }));
    await waitFor(() => expect(screen.getByText("lat:-1.2864 lon:36.8172")).toBeDefined());
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/^\/api\/geocode\?q=Nairobi$/);
  });
});
