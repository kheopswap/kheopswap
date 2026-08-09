import { useMemo } from "react";

import { useSyncObservable } from "react-rx";
import { getTokenPrices$ } from "../state/prices";

const DEFAULT_VALUE = { data: [], isLoading: true };

export const useTokenPrices = () => {
	const tokenPrices$ = useMemo(() => getTokenPrices$(), []);

	return useSyncObservable(tokenPrices$, DEFAULT_VALUE);
};
