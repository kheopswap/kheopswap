/* eslint-disable no-console */
import { FC, useEffect } from "react";

export const SuspenseMonitor: FC<{ label: string }> = ({ label }) => {
  useEffect(() => {
    if (import.meta.env.PROD) return;

    const key = `[Suspense] ${label} - ${crypto.randomUUID()}}`;
    console.time(key);

    const timeout = setTimeout(() => {
      console.warn(`[Suspense] ${label} is hanging`);
    }, 500);

    return () => {
      console.timeEnd(key);
      clearTimeout(timeout);
    };
  }, [label]);

  return null;
};
