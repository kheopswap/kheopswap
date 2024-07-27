import { bind } from "@react-rxjs/core";

import { loadingStatusSummary$ } from "src/services/loadingStatusSummary";

export const [useLoadingStatusSummary] = bind(loadingStatusSummary$);
