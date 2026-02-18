import { useMemo } from "react";

import { useObservable } from "react-rx";
import { getTokenPrices$ } from "../state/prices";

const DEFAULT_VALUE = { data: [], isLoading: true };

export const useTokenPrices = () => {
	const tokenPrices$ = useMemo(() => getTokenPrices$(), []);

	return useObservable(tokenPrices$, DEFAULT_VALUE);
};
