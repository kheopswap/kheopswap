import { bind } from "@react-rxjs/core";
import { getTokenPrices$ } from "../state/prices";

const [useAllTokenPrices] = bind(() => getTokenPrices$(), {
	data: [],
	isLoading: true,
});

export const useTokenPrices = () => useAllTokenPrices();
