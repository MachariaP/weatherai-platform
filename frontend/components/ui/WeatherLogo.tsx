"use client";

import Link from "next/link";
import { LogoMark } from "./icons";

export function WeatherLogo() {
  return (
    <Link
      href="/"
      aria-label="WeatherAI home"
      className="focus-ring inline-flex shrink-0 items-center gap-2.5 rounded-lg"
    >
      <span className="grid h-8 w-8 place-items-center text-accent">
        <LogoMark className="h-6 w-6" />
      </span>
      <span className="text-[17px] font-semibold tracking-tight text-accent">
        WeatherAI
      </span>
    </Link>
  );
}