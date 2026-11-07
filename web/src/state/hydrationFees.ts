import { XcmVersionedAssetId } from "@polkadot-api/descriptors";
import type { SS58String } from "polkadot-api";
import {
	catchError,
	distinctUntilChanged,
	from,
	map,
	type Observable,
	of,
	shareReplay,
	switchMap,
	timer,
} from "rxjs";
import { getApi, getApi$ } from "../papi/getApi";
import type { ChainIdHydration } from "../registry/chains/types";
import { getTokenId } from "../registry/tokens/helpers";
import type { TokenId } from "../registry/tokens/types";
import type { XcmV5Multilocation } from "../registry/types/xcm";
import { HDX_LOCAL_LOCATION } from "../utils/getAssetHubMirrorTokenId";
import { getCachedObservable$ } from "../utils/getCachedObservable";
import { safeStringify } from "../utils/serialization";

const HDX_ASSET_ID = 0;
const PRICE_REFRESH_MS = 30_000;
const PRICE_REFERENCE_WEIGHT = { ref_time: 10n ** 15n, proof_size: 0n };

export type HydrationFeePrice = { hdx: bigint; currency: bigint };

export const getHydrationFeeCurrencyTokenId = (
	chainId: ChainIdHydration,
	assetId: number | undefined,
): TokenId =>
	!assetId || assetId === HDX_ASSET_ID
		? getTokenId({ type: "native", chainId })
		: getTokenId({ type: "hydration-asset", chainId, assetId });

export const convertHydrationFee = (
	feeHdx: bigint,
	{ hdx, currency }: HydrationFeePrice,
): bigint => (feeHdx * currency + hdx - 1n) / hdx;

export const getHydrationFeeCurrencyTokenId$ = (
	chainId: ChainIdHydration,
	address: SS58String,
): Observable<TokenId> =>
	getCachedObservable$(
		"getHydrationFeeCurrencyTokenId$",
		`${chainId}::${address}`,
		() =>
			getApi$(chainId).pipe(
				switchMap((api) =>
					api.query.MultiTransactionPayment.AccountCurrencyMap.watchValue(
						address,
						{ at: "best" },
					),
				),
				map(({ value }) => getHydrationFeeCurrencyTokenId(chainId, value)),
				distinctUntilChanged(),
				shareReplay({ refCount: true, bufferSize: 1 }),
			),
	);

const queryHydrationFeePrice = async (
	chainId: ChainIdHydration,
	currency: XcmV5Multilocation,
): Promise<HydrationFeePrice | null> => {
	const api = await getApi(chainId);
	const [hdx, price] = await Promise.all(
		[HDX_LOCAL_LOCATION, currency].map((location) =>
			api.apis.XcmPaymentApi.query_weight_to_asset_fee(
				PRICE_REFERENCE_WEIGHT,
				XcmVersionedAssetId.V5(location),
				{ at: "best" },
			),
		),
	);
	return hdx?.success && price?.success && hdx.value > 0n
		? { hdx: hdx.value, currency: price.value }
		: null;
};

export const getHydrationFeePrice$ = (
	chainId: ChainIdHydration,
	currency: XcmV5Multilocation,
): Observable<HydrationFeePrice | null> =>
	getCachedObservable$(
		"getHydrationFeePrice$",
		`${chainId}::${safeStringify(currency)}`,
		() =>
			timer(0, PRICE_REFRESH_MS).pipe(
				switchMap(() =>
					from(queryHydrationFeePrice(chainId, currency)).pipe(
						catchError(() => of(null)),
					),
				),
				distinctUntilChanged(
					(a, b) => a?.hdx === b?.hdx && a?.currency === b?.currency,
				),
				shareReplay({ refCount: true, bufferSize: 1 }),
			),
	);
