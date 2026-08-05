import * as React from "react";
import { Link } from "react-router-dom";

interface PublicHeaderProps {
  rightAction?: React.ReactNode;
}

export function PublicHeader({ rightAction }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/p" className="flex items-center space-x-2.5 group">
          <img
            src="/ets-logo.png"
            alt="ETS Logo"
            className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
            onError={(e) => {
              // Fallback if image fails
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <div>
            <h1 className="font-normal text-[10px] sm:text-[11px] tracking-wider uppercase leading-tight text-zinc-400 group-hover:text-zinc-200 transition-colors">
              PROTECTING &amp; IMPROVING
              <br />
              ELECTRICITY
            </h1>
          </div>
        </Link>

        {/* Align Right Action */}
        {rightAction && <div className="flex items-center gap-2">{rightAction}</div>}
      </div>
    </header>
  );
}

