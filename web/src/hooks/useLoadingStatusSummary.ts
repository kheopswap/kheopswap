import { loadingStatusSummary$ } from "@kheopswap/services/loadingStatusSummary";
import { bind } from "@react-rxjs/core";

const DEFAULT_LOADING_STATUS = { total: 0, loading: 0, loaded: 0 };

export const [useLoadingStatusSummary] = bind(
	loadingStatusSummary$,
	DEFAULT_LOADING_STATUS,
);
