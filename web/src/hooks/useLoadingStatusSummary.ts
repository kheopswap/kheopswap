import { loadingStatusSummary$ } from "@kheopswap/services/loadingStatusSummary";
import { bind } from "@react-rxjs/core";

export const [useLoadingStatusSummary] = bind(loadingStatusSummary$);
