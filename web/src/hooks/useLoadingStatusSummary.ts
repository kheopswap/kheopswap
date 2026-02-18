import { bind } from "@react-rxjs/core";
import { loadingStatusSummary$ } from "../services/loadingStatusSummary";

export const [useLoadingStatusSummary] = bind(loadingStatusSummary$);
