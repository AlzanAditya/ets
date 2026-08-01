import { ShieldCheck } from "lucide-react";
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
            <p className="text-[11px] text-zinc-400 font-medium">
              Verifikasi &amp; Tracking Produk Resmi
            </p>
          </div>
        </Link>

        {/* Status Badge */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            Portal Publik Resmi
          </span>
        </div>
      </div>
    </header>
  );
}
