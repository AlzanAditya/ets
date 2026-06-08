import type { ReactNode } from "react"

export type Plan = "free" | "pro" | "max"

export interface NavigationItem {
  title: string
  url: string
  icon?: ReactNode
  plan?: Plan
  badge?: string | number
  badgeVariant?: "default" | "amber" | "emerald" | "destructive"
}

export interface PlanNavigationItem {
  name: string
  url: string
  icon: ReactNode
  plan?: Plan
  badge?: string | number
  badgeVariant?: "default" | "amber" | "emerald" | "destructive"
}

export interface QuickActionItem {
  title: string
  url: string
  label: string
  icon?: ReactNode
  variant?: "primary" | "secondary"
}

export interface UserProfile {
  name: string
  email: string
  avatar?: string
  fallback?: string
}

export interface BrandIdentity {
  title: string
  href: string
  logoSrc?: string
  logoAlt?: string
  tagline?: string[]
}

export interface PlanNavigationSection {
  label: string
  items: PlanNavigationItem[]
}

export interface AppNavigationConfig {
  brand: BrandIdentity
  user: UserProfile
  mainItems: NavigationItem[]
  quickActions: QuickActionItem[]
  planSections: PlanNavigationSection[]
  secondaryItems: NavigationItem[]
  breadcrumbLabels: Record<string, string>
}
