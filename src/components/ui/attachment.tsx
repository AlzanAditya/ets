import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const attachmentVariants = cva(
  "group relative flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 text-card-foreground transition-colors shadow-2xs",
  {
    variants: {
      orientation: {
        horizontal: "flex-row",
        vertical: "flex-col items-start p-3",
      },
      state: {
        idle: "hover:border-border/80",
        uploading: "border-primary/40 bg-primary/5",
        complete: "border-border",
        error: "border-destructive/40 bg-destructive/5",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      state: "idle",
    },
  }
)

export interface AttachmentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof attachmentVariants> {}

export const Attachment = React.forwardRef<HTMLDivElement, AttachmentProps>(
  ({ className, orientation, state, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-state={state}
        data-orientation={orientation}
        className={cn(attachmentVariants({ orientation, state }), className)}
        {...props}
      />
    )
  }
)
Attachment.displayName = "Attachment"

export interface AttachmentGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AttachmentGroup = React.forwardRef<
  HTMLDivElement,
  AttachmentGroupProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-wrap gap-2.5", className)}
      {...props}
    />
  )
})
AttachmentGroup.displayName = "AttachmentGroup"

const attachmentMediaVariants = cva(
  "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-muted-foreground",
  {
    variants: {
      variant: {
        default: "size-10 text-muted-foreground",
        icon: "size-10 bg-primary/10 text-primary",
        image: "size-16 sm:size-20 bg-background/50 [&>img]:h-full [&>img]:w-full [&>img]:object-cover",
        avatar: "size-9 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface AttachmentMediaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof attachmentMediaVariants> {}

export const AttachmentMedia = React.forwardRef<
  HTMLDivElement,
  AttachmentMediaProps
>(({ className, variant, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(attachmentMediaVariants({ variant }), className)}
      {...props}
    />
  )
})
AttachmentMedia.displayName = "AttachmentMedia"

export interface AttachmentContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AttachmentContent = React.forwardRef<
  HTMLDivElement,
  AttachmentContentProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex min-w-0 flex-1 flex-col gap-0.5", className)}
      {...props}
    />
  )
})
AttachmentContent.displayName = "AttachmentContent"

export interface AttachmentTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export const AttachmentTitle = React.forwardRef<
  HTMLHeadingElement,
  AttachmentTitleProps
>(({ className, ...props }, ref) => {
  return (
    <h4
      ref={ref}
      className={cn(
        "truncate text-xs font-semibold text-foreground leading-tight",
        className
      )}
      {...props}
    />
  )
})
AttachmentTitle.displayName = "AttachmentTitle"

export interface AttachmentDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export const AttachmentDescription = React.forwardRef<
  HTMLParagraphElement,
  AttachmentDescriptionProps
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        "truncate text-[11px] text-muted-foreground leading-tight",
        className
      )}
      {...props}
    />
  )
})
AttachmentDescription.displayName = "AttachmentDescription"

export interface AttachmentActionsProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AttachmentActions = React.forwardRef<
  HTMLDivElement,
  AttachmentActionsProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-center gap-1 shrink-0 ml-auto", className)}
      {...props}
    />
  )
})
AttachmentActions.displayName = "AttachmentActions"

export interface AttachmentActionProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const AttachmentAction = React.forwardRef<
  HTMLButtonElement,
  AttachmentActionProps
>(({ className, type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
})
AttachmentAction.displayName = "AttachmentAction"
