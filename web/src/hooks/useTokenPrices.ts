import { useMemo } from "react";

import { logger } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { getTokenPrices$ } from "src/state/prices";

const DEFAULT_VALUE = { data: [], isLoading: true };

export const useTokenPrices = () => {
	const stop = logger.cumulativeTimer("useTokenPrices");

	const tokenPrices$ = useMemo(() => getTokenPrices$(), []);

	const res = useObservable(tokenPrices$, DEFAULT_VALUE);

	stop();
	return res;
};
