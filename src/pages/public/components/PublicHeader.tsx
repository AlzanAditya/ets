import * as React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SmartImage } from "@/components/ui/smart-image";
import { CLIENT_IDENTITY } from "@/config/client-identity";

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
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/85 dark:bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/p" className="flex items-center space-x-2.5 group shrink-0">
          <SmartImage
            src={CLIENT_IDENTITY.logo.src}
            alt={CLIENT_IDENTITY.logo.alt || CLIENT_IDENTITY.shortName}
            className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <div>
            <h1 className="font-normal text-[10px] sm:text-[11px] tracking-wider uppercase leading-tight text-muted-foreground group-hover:text-foreground transition-colors">
              {CLIENT_IDENTITY.tagline.map((line, idx) => (
                <React.Fragment key={idx}>
                  {line}
                  {idx < CLIENT_IDENTITY.tagline.length - 1 && <br />}
                </React.Fragment>
              ))}
            </h1>
          </div>
        </Link>

        {/* Desktop Header Navigation (Specifically for desktop view as requested) */}
        {navItems && navItems.length > 0 && (
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-muted-foreground h-full">
            {navItems.map((item) => {
              const isActive = item.id === activeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={`relative h-full flex items-center justify-center transition-colors cursor-pointer select-none py-1.5 ${
                    isActive ? "text-primary font-extrabold" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activePublicNavIndicator"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
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

