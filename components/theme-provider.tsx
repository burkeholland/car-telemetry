"use client";
import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  ...props
}: Omit<React.ComponentProps<typeof NextThemesProvider>, 'children'> & { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem {...props}>
      {children}
    </NextThemesProvider>
  );
}
