import * as React from "react";
import {
  PencilIcon,
  UploadIcon,
  Trash2Icon,
  ExternalLinkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ─── Color Variants for Badges ───
export type BadgeColor =
  | "emerald"
  | "green"
  | "amber"
  | "yellow"
  | "blue"
  | "red"
  | "gray"
  | "zinc"
  | "purple"
  | "indigo";

const BADGE_COLOR_MAP: Record<BadgeColor, string> = {
  emerald: "border-emerald-500/80 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  green: "border-emerald-500/80 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  yellow: "border-amber-500/80 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  blue: "border-blue-500/80 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  red: "border-red-500/80 bg-red-500/10 text-red-600 dark:text-red-400",
  gray: "border-zinc-500/80 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  zinc: "border-zinc-500/80 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
  purple: "border-purple-500/80 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  indigo: "border-indigo-500/80 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
};

export interface EntityBadge {
  id?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string | number;
  value?: string | number;
  color?: BadgeColor;
  className?: string;
}

export interface EntityDetailItem {
  id?: string;
  icon?: React.ComponentType<{ className?: string }>;
  label?: string;
  value: React.ReactNode;
  href?: string;
}

export interface HeaderAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  className?: string;
  hideTextOnMobile?: boolean;
  disabled?: boolean;
}

// ─── Profile Configurations ───
export interface ProfileImageMode {
  type: "image";
  avatarUrl?: string | null;
  fallbackInitials: string;
  overlay?: {
    type: "pencil";
    title?: string;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
    onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onUploadClick?: () => void;
    onRemoveClick?: () => void;
  };
}

export interface ProfileIconMode {
  type: "icon";
  icon: React.ComponentType<{ className?: string }>;
  containerClassName?: string;
  iconClassName?: string;
  overlay?: {
    type: "client_avatar";
    avatarUrl?: string | null;
    fallbackInitials?: string;
    title?: string;
    onClick?: () => void;
  };
}

export type ProfileConfig = ProfileImageMode | ProfileIconMode;

export type EntityProfileBannerVariant =
  | "emerald"
  | "amber"
  | "orange"
  | "blue"
  | "rose"
  | "purple"
  | "indigo"
  | "slate"
  | "white"
  | "red";

const VARIANT_STYLES: Record<
  EntityProfileBannerVariant,
  {
    outerBorder: string;
    shadow: string;
    innerBg: string;
    detailIconBg: string;
    detailHoverBorder: string;
  }
> = {
  emerald: {
    outerBorder: "from-emerald-400/60 via-zinc-800/40 to-emerald-400/60",
    shadow: "shadow-[0_4px_24px_rgba(16,185,129,0.08)]",
    innerBg: "from-emerald-500/10 via-card/95 to-card dark:from-emerald-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    detailHoverBorder: "hover:border-emerald-500/40",
  },
  white: {
    outerBorder: "from-zinc-300/80 via-zinc-400/40 to-zinc-300/80 dark:from-zinc-600/70 dark:via-zinc-700/40 dark:to-zinc-600/70",
    shadow: "shadow-[0_4px_24px_rgba(0,0,0,0.06)]",
    innerBg: "from-zinc-100/90 via-card/95 to-card dark:from-zinc-900/90 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
    detailHoverBorder: "hover:border-zinc-400/50",
  },
  red: {
    outerBorder: "from-red-500/70 via-zinc-800/40 to-red-500/70",
    shadow: "shadow-[0_4px_24px_rgba(239,68,68,0.12)]",
    innerBg: "from-red-500/10 via-card/95 to-card dark:from-red-950/50 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
    detailHoverBorder: "hover:border-red-500/50",
  },
  amber: {
    outerBorder: "from-amber-400/60 via-zinc-800/40 to-amber-400/60",
    shadow: "shadow-[0_4px_24px_rgba(245,158,11,0.08)]",
    innerBg: "from-amber-500/10 via-card/95 to-card dark:from-amber-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    detailHoverBorder: "hover:border-amber-500/40",
  },
  orange: {
    outerBorder: "from-orange-400/60 via-zinc-800/40 to-orange-400/60",
    shadow: "shadow-[0_4px_24px_rgba(249,115,22,0.08)]",
    innerBg: "from-orange-500/10 via-card/95 to-card dark:from-orange-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    detailHoverBorder: "hover:border-orange-500/40",
  },
  blue: {
    outerBorder: "from-blue-400/60 via-zinc-800/40 to-blue-400/60",
    shadow: "shadow-[0_4px_24px_rgba(59,130,246,0.08)]",
    innerBg: "from-blue-500/10 via-card/95 to-card dark:from-blue-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    detailHoverBorder: "hover:border-blue-500/40",
  },
  rose: {
    outerBorder: "from-rose-400/60 via-zinc-800/40 to-rose-400/60",
    shadow: "shadow-[0_4px_24px_rgba(244,63,94,0.08)]",
    innerBg: "from-rose-500/10 via-card/95 to-card dark:from-rose-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    detailHoverBorder: "hover:border-rose-500/40",
  },
  purple: {
    outerBorder: "from-purple-400/60 via-zinc-800/40 to-purple-400/60",
    shadow: "shadow-[0_4px_24px_rgba(168,85,247,0.08)]",
    innerBg: "from-purple-500/10 via-card/95 to-card dark:from-purple-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    detailHoverBorder: "hover:border-purple-500/40",
  },
  indigo: {
    outerBorder: "from-indigo-400/60 via-zinc-800/40 to-indigo-400/60",
    shadow: "shadow-[0_4px_24px_rgba(99,102,241,0.08)]",
    innerBg: "from-indigo-500/10 via-card/95 to-card dark:from-indigo-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    detailHoverBorder: "hover:border-indigo-500/40",
  },
  slate: {
    outerBorder: "from-slate-400/60 via-zinc-800/40 to-slate-400/60",
    shadow: "shadow-[0_4px_24px_rgba(100,116,139,0.08)]",
    innerBg: "from-slate-500/10 via-card/95 to-card dark:from-slate-950/40 dark:via-zinc-900/95 dark:to-zinc-950",
    detailIconBg: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    detailHoverBorder: "hover:border-slate-500/40",
  },
};

export interface EntityProfileBannerProps {
  // Color Variant
  variant?: EntityProfileBannerVariant;

  // Profile (Image or Icon)
  profile?: ProfileConfig;

  // Identity
  title?: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;

  // Badges
  badges?: EntityBadge[];

  // Details List
  details?: EntityDetailItem[];

  // Header Actions
  headerActions?: HeaderAction[];

  // Expandable Area
  expandable?: {
    isExpandable?: boolean;
    defaultExpanded?: boolean;
    hideToggleTrigger?: boolean;
    expandTriggerLabel?: string;
    collapseTriggerLabel?: string;
    content: React.ReactNode;
  };

  // Direct Back Layer Content (Always visible without expand/collapse button)
  backLayerContent?: React.ReactNode;

  // Custom Front Layer (Custom layout inside gradient frame)
  customFrontLayer?: React.ReactNode;

  children?: React.ReactNode;
  className?: string;
}

export function EntityProfileBanner({
  variant = "emerald",
  profile,
  title = "",
  subtitle,
  meta,
  badges = [],
  details = [],
  headerActions = [],
  expandable,
  backLayerContent,
  customFrontLayer,
  children,
  className,
}: EntityProfileBannerProps) {
  const [isExpanded, setIsExpanded] = React.useState(
    expandable?.defaultExpanded ?? false
  );

  const currentVariant = VARIANT_STYLES[variant] || VARIANT_STYLES.emerald;

  const mainContent = (
    <div
      className={cn(
        "w-full h-full bg-gradient-to-br p-5 md:p-6 rounded-[calc(1rem-1px)] space-y-5",
        currentVariant.innerBg
      )}
    >
      {/* ── Top Main Header Row ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3.5 md:gap-4 w-full">
        {/* Left Column: Avatar & Identity */}
        <div className="flex flex-row items-start gap-4 md:gap-5 flex-1 min-w-0">
          {/* Profile Container */}
          {profile && (
            <div className="flex flex-col items-center gap-2.5 shrink-0">
              <div className="relative size-20 md:size-24 rounded-full shrink-0 border-2 border-border/80 bg-muted/40 flex items-center justify-center shadow-xs">
                {profile.type === "image" ? (
                  profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl || undefined}
                      alt={title}
                      className="size-[74px] md:size-[88px] rounded-full object-cover"
                    />
                  ) : (
                    <div className="size-[74px] md:size-[88px] rounded-full bg-primary/15 text-primary flex items-center justify-center text-xl md:text-2xl font-bold tracking-wider select-none">
                      {profile.fallbackInitials}
                    </div>
                  )
                ) : (
                  <div
                    className={cn(
                      "size-[74px] md:size-[88px] rounded-full bg-primary/10 text-primary flex items-center justify-center",
                      profile.containerClassName
                    )}
                  >
                    <profile.icon
                      className={cn("size-8 md:size-10", profile.iconClassName)}
                    />
                  </div>
                )}

                {/* ── Floating Overlay ── */}
                {profile.type === "image" && profile.overlay?.type === "pencil" && (
                  <>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 p-1.5 md:p-2 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform cursor-pointer border-2 border-background"
                          title={profile.overlay.title || "Ubah foto profil"}
                        >
                          <PencilIcon className="size-3 md:size-3.5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-48 rounded-xl">
                        <DropdownMenuItem
                          onClick={() => {
                            if (profile.type === "image" && profile.overlay?.type === "pencil") {
                              if (profile.overlay.fileInputRef?.current) {
                                profile.overlay.fileInputRef.current.click();
                              } else if (profile.overlay.onUploadClick) {
                                profile.overlay.onUploadClick();
                              }
                            }
                          }}
                          className="cursor-pointer gap-2 text-xs"
                        >
                          <UploadIcon className="size-4" />
                          <span>
                            {profile.avatarUrl ? "Ganti Foto Profil" : "Unggah Foto Profil"}
                          </span>
                        </DropdownMenuItem>
                        {profile.avatarUrl && profile.overlay.onRemoveClick && (
                          <DropdownMenuItem
                            onClick={profile.overlay.onRemoveClick}
                            className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2Icon className="size-4" />
                            <span>Hapus Foto Profil</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {profile.overlay.fileInputRef && profile.overlay.onFileChange && (
                      <input
                        type="file"
                        ref={profile.overlay.fileInputRef}
                        accept="image/*"
                        onChange={profile.overlay.onFileChange}
                        className="hidden"
                      />
                    )}
                  </>
                )}

                {profile.type === "icon" &&
                  profile.overlay?.type === "client_avatar" && (
                    <button
                      type="button"
                      onClick={profile.overlay.onClick}
                      title={profile.overlay.title || "Klien Pemilik"}
                      className={cn(
                        "absolute -bottom-1 -right-1 size-7 md:size-8 rounded-full border-2 border-background bg-card shadow-sm flex items-center justify-center overflow-hidden transition-transform",
                        profile.overlay.onClick && "hover:scale-105 cursor-pointer"
                      )}
                    >
                      {profile.overlay.avatarUrl ? (
                        <div className="relative size-full">
                          <img
                            src={profile.overlay.avatarUrl || undefined}
                            alt="Owner Avatar"
                            className="size-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              const fb = e.currentTarget.nextElementSibling;
                              if (fb) (fb as HTMLElement).style.display = "flex";
                            }}
                          />
                          <div style={{ display: "none" }} className="size-full bg-muted text-muted-foreground font-bold text-[10px] md:text-xs items-center justify-center">
                            {profile.overlay.fallbackInitials || "CL"}
                          </div>
                        </div>
                      ) : (
                        <div className="size-full bg-muted text-muted-foreground font-bold text-[10px] md:text-xs flex items-center justify-center">
                          {profile.overlay.fallbackInitials || "CL"}
                        </div>
                      )}
                    </button>
                  )}
              </div>
            </div>
          )}

          {/* Identity Info Column */}
          <div className="space-y-1.5 sm:space-y-2 flex-1 min-w-0 pt-0.5 sm:pt-1">
            <div className="space-y-1">
              <h1 className="text-base sm:text-lg md:text-2xl font-bold tracking-tight text-foreground break-words leading-snug">
                {title}
              </h1>

              {subtitle && (
                <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground font-medium">
                  {subtitle}
                </div>
              )}
            </div>

            {/* Badges placed inside identity info column */}
            {badges.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {badges.map((b, i) => {
                  const colorStyle = BADGE_COLOR_MAP[b.color || "emerald"];
                  return (
                    <div
                      key={b.id || i}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 md:px-3 py-0.5 md:py-1 rounded-full border font-bold text-xs shadow-2xs",
                        colorStyle,
                        b.className
                      )}
                    >
                      {b.icon && <b.icon className="size-3.5 shrink-0" />}
                      {b.label && <span>{b.label}</span>}
                      {b.value !== undefined && b.value !== null && (
                        <span>{b.value}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {meta && <div className="pt-0.5 text-[11px] sm:text-xs">{meta}</div>}
          </div>
        </div>

        {/* Right Column: Header Actions */}
        {headerActions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap self-start">
            {headerActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={cn("gap-1.5 text-xs rounded-xl", action.className)}
                >
                  {ActionIcon && <ActionIcon className="size-3.5" />}
                  <span
                    className={cn(
                      action.hideTextOnMobile ? "hidden sm:inline" : "inline"
                    )}
                  >
                    {action.label}
                  </span>
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Details Row / Flexible Grid & Flex Container ── */}
      {details.length > 0 && (
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2.5 sm:gap-3 pt-3 border-t border-border/50">
          {details.map((item, i) => {
            const ItemIcon = item.icon;
            const isFullWidthMobile = (details.length % 2 !== 0 && i === details.length - 1) || Boolean((item as any).fullWidth);
            const wrapperSpanClass = `${isFullWidthMobile ? "col-span-2" : "col-span-1"} sm:col-span-1 sm:flex-1 sm:min-w-[200px] sm:max-w-full min-w-0`;

            const content = (
              <div
                key={item.id || i}
                className={cn(
                  "flex items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 dark:bg-zinc-950/60 border border-border/80 dark:border-zinc-800/80 dark:hover:border-zinc-700/80 text-xs transition-colors h-full",
                  currentVariant.detailHoverBorder
                )}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                  {ItemIcon && (
                    <div className={cn("p-2 rounded-lg shrink-0", currentVariant.detailIconBg)}>
                      <ItemIcon className="size-4 shrink-0" />
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    {item.label && (
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block truncate">
                        {item.label}
                      </span>
                    )}
                    <span className="font-bold text-foreground dark:text-zinc-100 font-mono text-xs sm:text-sm break-words select-all">
                      {item.value || "—"}
                    </span>
                  </div>
                </div>

                {item.href && (
                  <ExternalLinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                )}
              </div>
            );

            if (item.href) {
              return (
                <a
                  key={item.id || i}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${wrapperSpanClass} block`}
                >
                  {content}
                </a>
              );
            }

            return (
              <div
                key={item.id || i}
                className={wrapperSpanClass}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}

      {children}
    </div>
  );

  // Render Front Layer (Product Header Card with gradient)
  const layerDepan = (
    <div
      className={cn(
        "relative z-10 rounded-2xl p-[1px] bg-gradient-to-bl overflow-hidden transition-all",
        currentVariant.outerBorder,
        currentVariant.shadow
      )}
    >
      {customFrontLayer ? (
        <div
          className={cn(
            "w-full h-full bg-gradient-to-br rounded-[calc(1rem-1px)]",
            currentVariant.innerBg
          )}
        >
          {customFrontLayer}
        </div>
      ) : (
        mainContent
      )}
    </div>
  );

  const effectiveBackLayer = backLayerContent || expandable?.content;
  const hideToggleTrigger =
    expandable?.hideToggleTrigger ||
    Boolean(backLayerContent) ||
    expandable?.isExpandable === false;

  if (!effectiveBackLayer) {
    return <div className={cn("relative w-full", className)}>{layerDepan}</div>;
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* ── LAYER BELAKANG: Flat Solid Component Container ── */}
      <div className="relative rounded-2xl bg-card border border-border/80 shadow-xs overflow-hidden transition-all">
        {/* Layer Depan (Header gradient) sitting at top 0 of Layer Belakang */}
        {layerDepan}

        {/* Layer Belakang Protruding Area */}
        {hideToggleTrigger ? (
          <div className="relative z-0 p-4 sm:p-5 md:p-6 bg-card text-foreground">
            {effectiveBackLayer}
          </div>
        ) : (
          <div className="relative z-0 px-4 py-2.5 md:px-6 md:py-3 bg-card space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer px-2 py-1.5 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <span>
                {isExpanded
                  ? expandable?.collapseTriggerLabel || "Sembunyikan Detail Tambahan"
                  : expandable?.expandTriggerLabel || "Tampilkan Detail Tambahan"}
              </span>
              {isExpanded ? (
                <ChevronUpIcon className="size-4 shrink-0" />
              ) : (
                <ChevronDownIcon className="size-4 shrink-0" />
              )}
            </Button>

            {isExpanded && (
              <div className="pt-2 pb-1 border-t border-border/60 transition-all animate-in fade-in slide-in-from-top-1 duration-200">
                {effectiveBackLayer}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export subcomponents
export { CompactDetailRow } from "./compact-detail-row";
export { EntityExpandableSection } from "./entity-expandable-section";
