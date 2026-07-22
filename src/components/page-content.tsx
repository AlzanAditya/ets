import type { ReactNode } from "react";

/**
 * Purpose: provide a consistent content frame for module pages.
 * Responsibilities: render page body slots.
 * Expected props: composed children.
 * Usage notes: header information has been shifted to SiteHeader via breadcrumbs.
 */
export function PageContent({
  children,
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
          {children}
        </div>
      </div>
    </div>
  );
}
