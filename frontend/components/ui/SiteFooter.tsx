export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:px-6 md:flex-row lg:px-6">
        <p className="text-[12px] font-bold tracking-[0.05em] text-text">
          © 2024 WeatherAI. Meteorological Data Precision.
        </p>
        <div className="flex items-center gap-4 text-sm text-text-muted">
          <a className="transition-colors hover:text-accent" href="#">
            Privacy Policy
          </a>
          <a className="transition-colors hover:text-accent" href="#">
            Terms of Service
          </a>
          <a className="transition-colors hover:text-accent" href="#">
            API Docs
          </a>
        </div>
      </div>
    </footer>
  );
}
