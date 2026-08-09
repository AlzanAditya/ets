import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SmartImage } from "@/components/ui/smart-image";

export interface NavItem {
  id: string;
  label: string;
  onClick: () => void;
}

interface PublicHeaderProps {
  rightAction?: React.ReactNode;
  navItems?: NavItem[];
  activeId?: string;
}

export function PublicHeader({ rightAction, navItems, activeId }: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/p" className="flex items-center space-x-2.5 group shrink-0">
          <SmartImage
            src="/ets-logo.png"
            alt="ETS Logo"
            className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="font-normal text-[10px] sm:text-[11px] tracking-wider uppercase leading-tight text-zinc-400 group-hover:text-zinc-200 transition-colors">
              PROTECTING &amp; IMPROVING
              <br />
              ELECTRICITY
            </h1>
          </div>
        </Link>

        {/* Desktop Header Navigation (Specifically for desktop view as requested) */}
        {navItems && navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-zinc-400 h-full">
            {navItems.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`relative h-full flex items-center justify-center transition-colors cursor-pointer select-none py-1.5 ${
                    isActive ? "text-emerald-400 font-extrabold" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activePublicNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Align Right Action */}
        {rightAction && <div className="flex items-center gap-2 shrink-0">{rightAction}</div>}
      </div>
    </header>
  );
}

