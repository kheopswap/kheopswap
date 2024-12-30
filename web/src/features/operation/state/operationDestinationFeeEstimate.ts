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
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
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
	if (!xcm) return of(loadableStateData(null));

	const destinationChain = getDestinationChain(chainId, xcm.destination);
	if (!destinationChain) return of(loadableStateData(null));

	return getApiLoadable$(destinationChain.id).pipe(
		switchMap(({ data: api, isLoading, error }) => {
			if (error) return of(loadableStateError<DestinationFee | null>(error));
			if (!api || !isApiWithDryRun(api))
				return of(loadableStateData(null, isLoading));

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
				return of(loadableStateData(null));

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

					return loadableStateData(result);
				}),
				startWith(loadableStateLoading<DestinationFee | null>()),
				catchError((error) =>
					of(loadableStateError<DestinationFee | null>(error)),
				),
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
				if (!chainId) return of(loadableStateData(null, isLoading));

				if (inputs.type !== "xcm") return of(loadableStateData(null));
				if (dryRunState.error)
					return of(
						loadableStateError<DestinationFee | null>(dryRunState.error),
					);
				if (!dryRunState.data)
					return of(loadableStateData(null, dryRunState.isLoading));

				return getDestinationFeeEstimate$(chainId, dryRunState.data);
			},
		),
		catchError((error) => of(loadableStateError<DestinationFee | null>(error))),
	),
	loadableStateLoading<DestinationFee | null>(),
);

// const getDestinationChain = (
// 	originChainId: ChainId,
// 	location: XcmV3Multilocation,
// ) => {
// 	const originChain = getChainById(originChainId);

// 	if (
// 		location.interior.type === "X1" &&
// 		location.interior.value.type === "Parachain"
// 	) {
// 		const paraId = location.interior.value.value;
// 		if (paraId) {
// 			const chain = getChains().find(
// 				(chain) => chain.relay === originChain.relay && chain.paraId === paraId,
// 			);
// 			if (chain) return chain;
// 		}
// 	}

// 	if (
// 		originChain.relay &&
// 		location.parents === 1 &&
// 		location.interior.type === "Here"
// 	)
// 		return getChainById(originChain.relay);

// 	throw new Error("Unexpected destination chain");
// };
