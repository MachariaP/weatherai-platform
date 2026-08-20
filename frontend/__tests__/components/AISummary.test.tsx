/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AISummary } from "@/components/weather/AISummary";

afterEach(cleanup);

describe("AISummary", () => {
  it("renders nothing when AI is disabled", () => {
    render(
      <AISummary
        enabled={false}
        summary="Expect warm and dry conditions throughout the day."
      />
    );
    expect(screen.queryByRole("region", { name: "AI weather insight" })).toBeNull();
    expect(screen.queryByText(/Expect warm/)).toBeNull();
  });

  it("renders the backend summary when available", () => {
    render(
      <AISummary
        enabled
        summary="Expect warm and dry conditions throughout the day."
      />
    );
    expect(screen.getByText("Expect warm and dry conditions throughout the day.")).toBeDefined();
  });

  it("does not fabricate a summary when ai_summary is null", () => {
    render(<AISummary enabled summary={null} />);
    expect(screen.getByText("No AI summary is available for this location.")).toBeDefined();
    expect(screen.queryByText(/expect/i)).toBeNull();
  });

  it("does not fabricate a summary from whitespace", () => {
    render(<AISummary enabled summary="   " />);
    expect(screen.getByText("No AI summary is available for this location.")).toBeDefined();
  });

  it("shows a safe message when the AI request failed", () => {
    render(
      <AISummary
        enabled
        summary={null}
        error={{ error: "plan_restriction", message: "Feature not available on this plan" }}
      />
    );
    expect(screen.getByText("AI insight could not be loaded for this request.")).toBeDefined();
    expect(screen.queryByText(/Feature not available/)).toBeNull();
  });
});
