"use client";

import { useEffect } from "react";

// Supress quickdev/fast-refresh logs that pollute console during navigation in dev.
export default function SuppressHotLogs() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    function shouldFilter(...args: any[]) {
      try {
        const s = args.map(a => String(a)).join(' ');
        if (!s) return false;
        return s.includes('[Fast Refresh]') || s.includes('hot-reloader-client.js');
      } catch {
        return false;
      }
    }

    console.log = (...args: any[]) => {
      if (shouldFilter(...args)) return;
      return origLog.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      if (shouldFilter(...args)) return;
      return origWarn.apply(console, args);
    };
    console.error = (...args: any[]) => {
      if (shouldFilter(...args)) return;
      return origError.apply(console, args);
    };

    return () => {
      console.log = origLog;
      console.warn = origWarn;
      console.error = origError;
    };
  }, []);

  return null;
}
