/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SearchBar } from "@/components/ui/SearchBar";
import { LocationProvider, useLocation } from "@/components/providers/LocationProvider";

afterEach(cleanup);

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
  fireEvent.submit(screen.getByRole("form", { name: "Search by coordinates" }));
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
    expect(screen.getByRole("alert").textContent).toMatch(/required/i);
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

  it("submits from the Look up button", () => {
    renderSearch();
    fireEvent.change(screen.getByLabelText("Latitude"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Longitude"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /look up/i }));
    expect(screen.getByText("lat:0 lon:0")).toBeDefined();
  });
});
