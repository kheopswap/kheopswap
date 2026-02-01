import { bind } from "@react-rxjs/core";
import { getTokenPrices$ } from "src/state/prices";

const DEFAULT_VALUE = { data: [], isLoading: true };

// For non-parameterized observables, bind() at module level with default value
const [useTokenPricesInternal] = bind(getTokenPrices$(), DEFAULT_VALUE);

export const useTokenPrices = () => {
	return useTokenPricesInternal();
};
