export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-8 sm:px-6 lg:px-6">
        <p className="text-[12px] font-medium tracking-[0.05em] text-text-muted">
          © {new Date().getFullYear()} WeatherAI
        </p>
      </div>
    </footer>
  );
}
