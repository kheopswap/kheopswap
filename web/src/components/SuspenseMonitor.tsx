/* eslint-disable no-console */
import { FC, useEffect } from "react";

import { DEV } from "src/config/constants";

export const SuspenseMonitor: FC<{ label: string }> = ({ label }) => {
  useEffect(() => {
    // eslint-disable-next-line no-constant-condition
    if (false && !DEV) return; // TODO remove false

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
