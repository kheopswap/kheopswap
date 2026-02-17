import { getApi$ } from "@kheopswap/papi";
import { bind } from "@react-rxjs/core";
import { switchMap } from "rxjs";
import { assetHub$ } from "src/state/relay";

const [useBestBlockNumber] = bind(
	assetHub$.pipe(
		switchMap((assetHub) =>
			getApi$(assetHub.id).pipe(
				switchMap((api) => api.query.System.Number.watchValue("best")),
			),
		),
	),
	null,
);

const [useFinalizedBlockNumber] = bind(
	assetHub$.pipe(
		switchMap((assetHub) =>
			getApi$(assetHub.id).pipe(
				switchMap((api) => api.query.System.Number.watchValue("finalized")),
			),
		),
	),
	null,
);

export const ChainBlockNumbers = () => {
	const best = useBestBlockNumber();
	const finalized = useFinalizedBlockNumber();

	return (
		<div className=" text-neutral-500 flex flex-col gap-1 text-xs">
			<div>Best: {best ?? "–"}</div>
			<div>Finalized: {finalized ?? "–"}</div>
		</div>
	);
};
