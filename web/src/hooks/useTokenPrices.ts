import { bind } from "@react-rxjs/core";
import { getTokenPrices$ } from "../state/prices";

export const [useTokenPrices] = bind(getTokenPrices$(), {
	data: [],
	isLoading: true,
});
