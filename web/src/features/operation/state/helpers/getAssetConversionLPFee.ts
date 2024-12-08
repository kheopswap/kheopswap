import { getApi$ } from "@kheopswap/papi";
import type { ChainIdAssetHub } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableStateData,
	loadableStateError,
	loadableStateLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { catchError, from, map, of, startWith, switchMap } from "rxjs";

export const [useAssetConversionLPFee, getAssetConversionLPFee$] = bind<
	[ChainIdAssetHub],
	LoadableState<number>
>((chainId) =>
	getApi$(chainId).pipe(
		// tap({
		// 	subscribe: () => {
		// 		console.log("[debug] subscribe getAssetConvertionLPFee$", chainId);
		// 	},
		// 	unsubscribe: () => {
		// 		console.log("[debug] unsubscribe getAssetConvertionLPFee$", chainId);
		// 	},
		// }),
		switchMap((api) => from(api.constants.AssetConversion.LPFee())),
		map((lpFee) => loadableStateData(lpFee)),
		startWith(loadableStateLoading<number>()),
		catchError((cause) =>
			of(
				loadableStateError<number>(
					new Error(`Failed to get LP Fee for chain ${chainId}`, { cause }),
				),
			),
		),
	),
);
