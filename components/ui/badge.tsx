import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors";
  const styles: Record<string, string> = {
    default: "bg-accent text-accent-foreground border-transparent",
    secondary: "bg-muted text-muted-foreground border-transparent",
    outline: "text-foreground border-border",
    destructive: "bg-destructive text-destructive-foreground border-transparent",
  };
  return <span className={cn(base, styles[variant], className)} {...props} />;
}
