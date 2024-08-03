import { type FC, useEffect } from "react";

import { DEV } from "src/config/constants";

export const SuspenseMonitor: FC<{ label: string }> = ({ label }) => {
	useEffect(() => {
		// biome-ignore lint/correctness/noConstantCondition: <explanation>
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
