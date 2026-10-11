import { bind } from "@react-rxjs/core";
import { useDeferredValue } from "react";
import { loadingStatusSummary$ } from "../../services/loadingStatusSummary";

const [useLoadingStatusSummary] = bind(loadingStatusSummary$);

export const LoadingStatus = () => {
	const { loaded, total } = useDeferredValue(useLoadingStatusSummary());
	return (
		<div>
			{loaded}/{total} active subscriptions
		</div>
	);
};
