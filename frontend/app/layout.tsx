"use client";
import "./globals.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { KeyboardShortcutsProvider } from "@/context/KeyboardShortcutsContext";
import { KeyboardShortcutsHelp } from "@/components/common/KeyboardShortcutsHelp";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30_000,
      },
    },
  }));

  return (
    <html lang="en">
      <head>
        <title>Route53 Console</title>
        <meta name="description" content="AWS Route53 Clone - DNS Management Console" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌐</text></svg>" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ThemeProvider>
          <KeyboardShortcutsProvider>
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <ToastProvider>
                  {children}
                  <KeyboardShortcutsHelp />
                </ToastProvider>
              </AuthProvider>
            </QueryClientProvider>
          </KeyboardShortcutsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
