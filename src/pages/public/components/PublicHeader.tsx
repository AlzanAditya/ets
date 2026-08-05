import { Link } from "react-router-dom";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/p" className="flex items-center space-x-3 group">
          <img
            src="/ets-logo.png"
            alt="ETS Logo"
            className="h-9 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              // Fallback if image fails
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-zinc-100 group-hover:text-emerald-400 transition-colors">
                Electrical Tracking System
              </h1>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
