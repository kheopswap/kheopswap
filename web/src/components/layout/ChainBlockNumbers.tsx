import { bind } from "@react-rxjs/core";
import { map, switchMap } from "rxjs";
import { getApi$ } from "../../papi/getApi";
import { assetHub$ } from "../../state/relay";

const [useBestBlockNumber] = bind(
	assetHub$.pipe(
		switchMap((assetHub) =>
			getApi$(assetHub.id).pipe(
				switchMap((api) => api.query.System.Number.watchValue({ at: "best" })),
			),
		),
		map((update) => update.value),
	),
	null,
);

const [useFinalizedBlockNumber] = bind(
	assetHub$.pipe(
		switchMap((assetHub) =>
			getApi$(assetHub.id).pipe(
				switchMap((api) =>
					api.query.System.Number.watchValue({ at: "finalized" }),
				),
			),
		),
		map((update) => update.value),
	),
	null,
);

export const ChainBlockNumbers = () => {
	const best = useBestBlockNumber();
	const finalized = useFinalizedBlockNumber();

	return (
		<div className="grid grid-cols-[auto_auto] gap-x-2 gap-y-1 text-left">
			<div>Best:</div>
			<div>{best ?? <Placeholder />}</div>
			<div>Finalized:</div>
			<div>{finalized ?? <Placeholder />}</div>
		</div>
	);
};

const Placeholder = () => (
	<span className="animate-pulse rounded-xs bg-hover text-transparent">
		00000000
	</span>
);
