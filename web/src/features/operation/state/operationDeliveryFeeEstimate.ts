import { getApiLoadable$, isApiIn, isApiWithDryRun } from "@kheopswap/papi";
import {
	type ChainId,
	type XcmV3Multilocation,
	type XcmV4Instruction,
	getTokenIdFromXcmV3Multilocation,
} from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	loadableLoading,
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
	if (!xcm) return of(loadableData(null));

	return getApiLoadable$(chainId).pipe(
		switchMap(({ data: api, isLoading, error }) => {
			if (error) return of(loadableError<DeliveryFee | null>(error));
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
					"paseo",
					"pasah",
					"hydration",
					"laos",
				])
			)
				return of(loadableData(null));

			logger.debug("[api call] XcmPaymentApi.query_delivery_fees", {
				chainId,
				xcm,
			});

			return from(
				api.apis.XcmPaymentApi.query_delivery_fees(
					Enum("V4", xcm.destination),
					Enum("V4", xcm.message as XcmV4Instruction[]),
					{ at: "best" },
				),
			).pipe(
				map((deliveryFee) => {
					if (!deliveryFee.success) throw new Error("Failed to estimate");

					// TODO remove
					logger.log("DeliveryFee", {
						chainId,
						xcm,
					});

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

					return loadableData(result);
				}),
				startWith(loadableLoading<DeliveryFee | null>()),
				catchError((error) => of(loadableError<DeliveryFee | null>(error))),
			);
		}),
	);
};

export const [useOperationDeliveryFeeEstimate, operationDeliveryFeeEstimate$] =
	bind(
		combineLatest([operationInputs$, operationDryRun$]).pipe(
			switchMap(
				([{ data: inputs, isLoading }, dryRunState]): Observable<
					LoadableState<DeliveryFee | null>
				> => {
					const chainId = inputs?.tokenIn?.token?.chainId;
					if (!chainId) return of(loadableData(null, isLoading));

					if (inputs.type !== "xcm") return of(loadableData(null, isLoading));
					if (dryRunState.error)
						return of(loadableError<DeliveryFee | null>(dryRunState.error));
					if (!dryRunState.data)
						return of(loadableData(null, isLoading || dryRunState.isLoading));

					return getDeliveryFeeEstimate$(chainId, dryRunState.data);
				},
			),

			catchError((error) => of(loadableError<DeliveryFee | null>(error))),
		),
		loadableLoading<DeliveryFee | null>(),
	);
