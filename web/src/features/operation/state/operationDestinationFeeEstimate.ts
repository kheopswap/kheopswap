import { getApiLoadable$, isApiIn, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	XcmV3Junctions,
	type XcmV4Instruction,
	XcmVersionedAssetId,
	getTokenId,
	isChainIdRelay,
} from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	lodableLoading,
	logger,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { Enum } from "polkadot-api";
import {
	type Observable,
	catchError,
	combineLatest,
	from,
	map,
	of,
	startWith,
	switchMap,
} from "rxjs";
import {
	type DryRun,
	getDestinationChain,
	getXcmMessageFromDryRun,
} from "src/util";
import { operationDryRun$ } from "./operationDryRun";
import { operationInputs$ } from "./operationInputs";

type DestinationFee = {
	tokenId: string;
	plancks: bigint;
};

const getDestinationFeeEstimate$ = <Id extends ChainId>(
	chainId: Id,
	dryRun: DryRun<Id>,
): Observable<LoadableState<DestinationFee | null>> => {
	const xcm = getXcmMessageFromDryRun(dryRun);
	if (!xcm) return of(loadableData(null));

	const destinationChain = getDestinationChain(chainId, xcm.destination);
	if (!destinationChain) return of(loadableData(null));

	return getApiLoadable$(destinationChain.id).pipe(
		switchMap(({ data: api, isLoading, error }) => {
			if (error) return of(loadableError<DestinationFee | null>(error));
			if (!api || !isApiWithDryRun(api))
				return of(loadableData(null, isLoading));

			if (
				!isApiIn(api, [
					"polkadot",
					"pah",
					"bifrostPolkadot",
					"moonbeam",
					"kusama",
					"kah",
				])
			)
				return of(loadableData(null));

			logger.debug("[api call] XcmPaymentApi.query_xcm_weight", {
				chainId,
				xcm,
			});

			return from(
				api.apis.XcmPaymentApi.query_xcm_weight(
					Enum("V4", xcm.message as XcmV4Instruction[]),
					{ at: "best" },
				),
			).pipe(
				map((resWeight) => {
					if (!resWeight.success) {
						logger.error("[operation] XcmPaymentApi.query_xcm_weight failed", {
							resWeight,
						});
						throw new Error("Failed to get weight for destination fee");
					}
					return resWeight.value;
				}),
				switchMap((weight) => {
					logger.debug("[api call] XcmPaymentApi.query_weight_to_asset_fee", {
						chainId,
						weight,
						destinationChain,
					});

					return api.apis.XcmPaymentApi.query_weight_to_asset_fee(
						weight,
						XcmVersionedAssetId.V4({
							parents: isChainIdRelay(destinationChain.id) ? 0 : 1,
							interior: XcmV3Junctions.Here(),
						}),
						{ at: "best" },
					);
				}),
				map((fee) => {
					if (!fee.success) {
						logger.error(
							"[operation] XcmPaymentApi.query_weight_to_asset_fee failed",
							{ fee },
						);
						// TODO lookup error message in metadata
						throw new Error("Failed to estimate destination fee");
					}

					const result: DestinationFee = {
						tokenId: getTokenId({
							type: "native",
							chainId: destinationChain.id,
						}),
						plancks: fee.value,
					};

					return loadableData(result);
				}),
				startWith(lodableLoading<DestinationFee | null>()),
				catchError((error) => of(loadableError<DestinationFee | null>(error))),
			);
		}),
	);
};

export const [
	useOperationDestinationFeeEstimate,
	operationDestinationFeeEstimate$,
] = bind(
	combineLatest([operationInputs$, operationDryRun$]).pipe(
		switchMap(
			([{ data: inputs, isLoading }, dryRunState]): Observable<
				LoadableState<DestinationFee | null>
			> => {
				const chainId = inputs?.tokenIn?.token?.chainId;
				if (!chainId) return of(loadableData(null, isLoading));

				if (inputs.type !== "xcm") return of(loadableData(null));
				if (dryRunState.error)
					return of(loadableError<DestinationFee | null>(dryRunState.error));
				if (!dryRunState.data)
					return of(loadableData(null, dryRunState.isLoading));

				return getDestinationFeeEstimate$(chainId, dryRunState.data);
			},
		),
		catchError((error) => of(loadableError<DestinationFee | null>(error))),
	),
	lodableLoading<DestinationFee | null>(),
);
