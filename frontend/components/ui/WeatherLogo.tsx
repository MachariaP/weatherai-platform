import Link from "next/link";
import { LogoMark } from "./icons";

export function WeatherLogo() {
  return (
    <Link
      href="/"
      aria-label="WeatherAI home"
      className="focus-ring inline-flex shrink-0 items-center gap-2.5 rounded-lg"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl border border-accent/25 bg-accent/15 text-accent">
        <LogoMark className="h-5 w-5" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-text">
        Weather<span className="text-accent">AI</span>
      </span>
    </Link>
  );
}