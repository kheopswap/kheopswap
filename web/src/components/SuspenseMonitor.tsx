import { logger } from "@kheopswap/utils";
import { type FC, useEffect } from "react";

import { DEV } from "src/config/constants";

export const SuspenseMonitor: FC<{ label: string }> = ({ label }) => {
	useEffect(() => {
		// biome-ignore lint/correctness/noConstantCondition: <explanation>
		if (false && !DEV) return; // TODO remove false

		const stop = logger.timer(`[Suspense] ${label}`);

		const timeout = setTimeout(() => {
			console.warn(`[Suspense] ${label} is hanging`);
		}, 500);

		return () => {
			stop();
			clearTimeout(timeout);
		};
	}, [label]);

	return null;
};
