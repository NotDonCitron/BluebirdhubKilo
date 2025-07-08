
import '../lib/polyfills';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import { ErrorBoundary } from '@/components/error-boundary';
import { SessionProvider } from '@/components/providers/session-provider';
import { SessionTimeoutProvider } from '@/components/providers/session-timeout-provider';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BlueBirdHub - AI-Powered Productivity Workspace',
  description: 'A comprehensive productivity application with AI-powered task management, file organization, and real-time collaboration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <ErrorBoundary>
              <SessionTimeoutProvider>
                {children}
              </SessionTimeoutProvider>
            </ErrorBoundary>
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
