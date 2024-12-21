import { getApiLoadable$, isApiIn, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	type XcmV3Multilocation,
	type XcmV4Instruction,
	getTokenIdFromXcmV3Multilocation,
} from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
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
import { type DryRun, getXcmMessageFromDryRun } from "src/util";
import { operationDryRun$ } from "./operationDryRun";
import { operationInputs$ } from "./operationInputs";

type DeliveryFee = {
	tokenId: string;
	plancks: bigint;
};

const getDeliveryFeeEstimate$ = <Id extends ChainId>(
	chainId: Id,
	dryRun: DryRun<Id>,
): Observable<LoadableState<DeliveryFee | null>> => {
	const xcm = getXcmMessageFromDryRun(dryRun);
	if (!xcm) return of(loadableStateData(null));

	return getApiLoadable$(chainId).pipe(
		switchMap(({ data: api, isLoading, error }) => {
			if (error) return of(loadableStateError<DeliveryFee | null>(error));
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

			return from(
				api.apis.XcmPaymentApi.query_delivery_fees(
					Enum("V4", xcm.destination),
					Enum("V4", xcm.message as XcmV4Instruction[]),
					{ at: "best" },
				),
			).pipe(
				map((deliveryFee) => {
					if (!deliveryFee.success) throw new Error("Failed to estimate");

					const assets =
						deliveryFee.value.type === "V4" && deliveryFee.value.value;

					if (!assets) throw new Error("Unkown");
					if (assets?.length !== 1) throw new Error("Unkown");
					const fee = deliveryFee.value.value[0];
					if (fee?.fun.type !== "Fungible")
						throw new Error("Unexpected fee type");

					const tokenId = getTokenIdFromXcmV3Multilocation(
						chainId,
						fee.id as XcmV3Multilocation,
					);
					if (!tokenId) throw new Error("Unknown fee token");

					const result: DeliveryFee = {
						tokenId,
						plancks: fee.fun.value,
					};

					return loadableStateData(result);
				}),
				startWith(loadableStateLoading<DeliveryFee | null>()),
				catchError((error) =>
					of(loadableStateError<DeliveryFee | null>(error)),
				),
			);
		}),
	);
};

export const [useOperationDeliveryFeeEstimate, operationDeliveryFeeEstimate$] =
	bind(
		combineLatest([operationInputs$, operationDryRun$]).pipe(
			switchMap(
				([inputs, dryRunState]): Observable<
					LoadableState<DeliveryFee | null>
				> => {
					const chainId = inputs.tokenIn?.token?.chainId;
					if (!chainId) return of(loadableStateData(null));

					if (inputs.type !== "xcm") return of(loadableStateData(null));
					if (dryRunState.error)
						return of(
							loadableStateError<DeliveryFee | null>(dryRunState.error),
						);
					if (!dryRunState.data)
						return of(loadableStateData(null, dryRunState.isLoading));

					return getDeliveryFeeEstimate$(chainId, dryRunState.data);
				},
			),
			startWith(loadableStateLoading<DeliveryFee | null>()),
			catchError((error) => of(loadableStateError<DeliveryFee | null>(error))),
		),
	);