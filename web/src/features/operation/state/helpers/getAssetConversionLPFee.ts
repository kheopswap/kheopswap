import { getApi$ } from "@kheopswap/papi";
import type { ChainIdAssetHub } from "@kheopswap/registry";
import {
	type LoadableState,
	loadableData,
	loadableError,
	lodableLoading,
} from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { catchError, from, map, of, switchMap } from "rxjs";

export const [useAssetConversionLPFee, getAssetConversionLPFee$] = bind<
	[ChainIdAssetHub],
	LoadableState<number>
>(
	(chainId) =>
		getApi$(chainId).pipe(
			switchMap((api) => from(api.constants.AssetConversion.LPFee())),
			map((lpFee) => loadableData(lpFee)),
			catchError((cause) =>
				of(
					loadableError<number>(
						new Error(`Failed to get LP Fee for chain ${chainId}`, { cause }),
					),
				),
			),
		),
	() => lodableLoading(),
);
