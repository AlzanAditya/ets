import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

const placeholderActions = <Badge variant="outline">Development Preview</Badge>;

/**
 * Purpose: provide a consistent content frame for module pages.
 * Responsibilities: render page identity, optional action content, and page body slots.
 * Expected props: title, description, optional actions, and composed children.
 * Usage notes: generic placeholder copy allows isolated rendering without external data.
 */
export function PageContent({
  actions = placeholderActions,
  children,
  description = "Placeholder description for development preview.",
  eyebrow = "Module",
  title = "Sample Page",
}: {
  actions?: ReactNode;
  children?: ReactNode;
  description?: string;
  eyebrow?: string;
  title?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col no-scrollbar">
      <div className="@container/main flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col gap-3 px-4 lg:flex-row lg:items-start lg:justify-between lg:px-6">
            <div className="flex max-w-3xl flex-col gap-1">
              <div className="text-xs font-medium uppercase text-muted-foreground">
                {eyebrow}
              </div>
              <h1 className="text-2xl font-semibold tracking-normal text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {actions ? (
              <div className="flex items-center gap-2">{actions}</div>
            ) : null}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
