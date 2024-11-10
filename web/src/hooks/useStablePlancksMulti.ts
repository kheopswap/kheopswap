import { useMemo } from "react";

import type { TokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { type Observable, map, switchMap } from "rxjs";
import { getAssetConvertMulti$ } from "src/state/convert";
import { stableToken$ } from "src/state/relay";
import { getAssetHubMirrorTokenId } from "src/util";

type UseStablePlancksProps = {
	inputs: { tokenId: TokenId; plancks: bigint | undefined }[];
};

type UseStablePlancksResult = {
	isLoading: boolean;
	data: { stablePlancks: bigint | null; isLoadingStablePlancks: boolean }[];
};

// const getStablePlanck$ = (tokenId: TokenId, plancks: bigint | undefined) => {
// 	stableToken$.pipe(
// 		map((stableToken) => ({
// 			tokenIdIn: getAssetHubMirrorTokenId(tokenId),
// 			plancksIn: plancks ?? 0n,
// 			tokenIdOut: stableToken.id,
// 		})),
// 		switchMap(getAssetConvert$), // includes throttling
// 		map(({ plancksOut, isLoading }) => ({
// 			stablePlancks: plancksOut,
// 			isLoadingStablePlancks: isLoading,
// 		})),
// 		shareReplay({ bufferSize: 1, refCount: true }),
// 	);
// };

const getStablePlancksMulti$ = (
	inputs: { tokenId: TokenId; plancks: bigint | undefined }[],
): Observable<UseStablePlancksResult> => {
	return stableToken$.pipe(
		map((stableToken) =>
			inputs.map(({ tokenId, plancks }) => ({
				tokenIdIn: getAssetHubMirrorTokenId(tokenId),
				plancksIn: plancks ?? 0n,
				tokenIdOut: stableToken.id,
			})),
		),
		switchMap(getAssetConvertMulti$), // includes throttling
		map((outputs) => ({
			data: outputs.data.map(({ plancksOut, isLoading }) => ({
				stablePlancks: plancksOut,
				isLoadingStablePlancks: isLoading,
			})),
			isLoading: outputs.isLoading,
		})),
	);
};

const DEFAULT_VALUE = { isLoading: true, data: [] };

export const useStablePlancksMulti = ({
	inputs,
}: UseStablePlancksProps): UseStablePlancksResult => {
	const stop = logger.cumulativeTimer("useStablePlancksMulti");

	const obs = useMemo(() => getStablePlancksMulti$(inputs), [inputs]);

	const res = useObservable(obs, DEFAULT_VALUE);

	stop();

	return res;
};
