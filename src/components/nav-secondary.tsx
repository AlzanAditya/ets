import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { LanguagesIcon, MoonIcon, SunIcon } from "lucide-react"
import type { NavigationItem } from "@/types/navigation"

type Theme = "light" | "dark"

const placeholderItems = [
  {
    title: "Settings",
    url: "/settings",
  },
] satisfies NavigationItem[]

function getInitialTheme(storageKey: string): Theme {
  if (typeof window === "undefined") {
    return "light"
  }

  const savedTheme = window.localStorage.getItem(storageKey)
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

/**
 * Purpose: render secondary sidebar navigation and lightweight preferences.
 * Responsibilities: show secondary links and manage local theme selection.
 * Expected props: secondary nav items and optional storage key.
 * Usage notes: generic settings item is used when no items are supplied.
 */
export function NavSecondary({
  items = placeholderItems,
  activeUrl,
  onNavigate,
  themeStorageKey = "app-theme",
  ...props
}: {
  items?: NavigationItem[]
  activeUrl?: string
  onNavigate?: (url: string, title: string) => void
  themeStorageKey?: string
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const { isMobile } = useSidebar()
  const [theme, setTheme] = React.useState<Theme>(() =>
    getInitialTheme(themeStorageKey)
  )

  React.useEffect(() => {
    const root = document.documentElement

    root.classList.toggle("dark", theme === "dark")
    window.localStorage.setItem(themeStorageKey, theme)
  }, [theme, themeStorageKey])

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              {item.title === "Settings" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      isActive={activeUrl === item.url}
                      onClick={() => onNavigate?.(item.url, item.title)}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-56 rounded-lg"
                    side={isMobile ? "bottom" : "right"}
                    align={isMobile ? "end" : "start"}
                  >
                    <DropdownMenuLabel>Appearance</DropdownMenuLabel>
                    <DropdownMenuRadioGroup
                      value={theme}
                      onValueChange={(value) => setTheme(value as Theme)}
                    >
                      <DropdownMenuRadioItem value="light">
                        <SunIcon />
                        Light mode
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="dark">
                        <MoonIcon />
                        Dark mode
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <LanguagesIcon />
                        Language
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-44">
                        <DropdownMenuRadioGroup value="en">
                          <DropdownMenuRadioItem value="en">
                            English
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="id">
                            Bahasa Indonesia
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <SidebarMenuButton asChild>
                  <a
                    href={item.url}
                    onClick={(event) => {
                      event.preventDefault()
                      onNavigate?.(item.url, item.title)
                    }}
                  >
                    {item.icon}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
