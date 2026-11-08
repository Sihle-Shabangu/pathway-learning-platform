"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {

  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          // Rich-colour toasts: Sonner's default text colours fail WCAG AA on their tinted
          // backgrounds (axe flagged the success toast), so use darker text that passes.
          "--success-bg": "#f0fdf4",
          "--success-border": "#bbf7d0",
          "--success-text": "#166534",
          "--error-bg": "#fef2f2",
          "--error-border": "#fecaca",
          "--error-text": "#991b1b",
          "--warning-bg": "#fffbeb",
          "--warning-border": "#fde68a",
          "--warning-text": "#92400e",
          "--info-bg": "var(--primary-soft)",
          "--info-border": "#c7d0f8",
          "--info-text": "var(--primary-hover)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
