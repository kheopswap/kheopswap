import { bind } from "@react-rxjs/core";

import { loadingStatusSummary$ } from "@kheopswap/services/loadingStatusSummary";

export const [useLoadingStatusSummary] = bind(loadingStatusSummary$);
