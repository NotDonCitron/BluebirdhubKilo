"use client";

import { useEffect } from "react";

export default function SentryTestError() {
  useEffect(() => {
    throw new Error("Sentry test error: This is a test error for Sentry integration.");
  }, []);
  return <div>Testing Sentry error boundary...</div>;
} 