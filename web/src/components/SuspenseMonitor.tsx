import { logger } from "@kheopswap/utils";
import { type FC, useEffect, useRef } from "react";

import { DEV } from "@kheopswap/constants";

const SHOULD_LOG = DEV || true; // TODO only DEV

export const SuspenseMonitorInner: FC<{ label: string }> = ({ label }) => {
	const refStart = useRef(performance.now());

	useEffect(() => {
		const timeout = setTimeout(() => {
			console.warn(`[Suspense] ${label} is hanging`);
		}, 500);

		return () => {
			logger.debug(
				"[Suspense] %s : %s ms",
				label,
				(performance.now() - refStart.current).toFixed(2),
			);
			clearTimeout(timeout);
		};
	}, [label]);

	return null;
};

export const SuspenseMonitor: FC<{ label: string }> = ({ label }) =>
	SHOULD_LOG ? <SuspenseMonitorInner label={label} /> : null;
