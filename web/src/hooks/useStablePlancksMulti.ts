import type { TokenId } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import { useMemo } from "react";
import { useObservable } from "react-rx";
import { map, type Observable, switchMap } from "rxjs";
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

const getStablePlancksMulti$ = (
	inputs: { tokenId: TokenId; plancks: bigint | undefined }[],
): Observable<UseStablePlancksResult> => {
	// Create a stable cache key from inputs
	const cacheKey = inputs
		.map(({ tokenId, plancks }) => `${tokenId}:${plancks ?? "null"}`)
		.join(",");

	return getCachedObservable$("getStablePlancksMulti$", cacheKey, () =>
		stableToken$.pipe(
			switchMap((stableToken) => {
				// If stable token not loaded yet, return loading state
				if (!stableToken) {
					return [
						{
							isLoading: true,
							data: inputs.map(() => ({
								stablePlancks: null,
								isLoadingStablePlancks: true,
							})),
						},
					];
				}
				const convertInputs = inputs.map(({ tokenId, plancks }) => ({
					tokenIdIn: getAssetHubMirrorTokenId(tokenId),
					plancksIn: plancks ?? 0n,
					tokenIdOut: stableToken.id,
				}));
				return getAssetConvertMulti$(convertInputs).pipe(
					map((outputs) => ({
						data: outputs.data.map(({ plancksOut, isLoading }) => ({
							stablePlancks: plancksOut,
							isLoadingStablePlancks: isLoading,
						})),
						isLoading: outputs.isLoading,
					})),
				);
			}),
		),
	);
};

const DEFAULT_VALUE = { isLoading: true, data: [] };

export const useStablePlancksMulti = ({
	inputs,
}: UseStablePlancksProps): UseStablePlancksResult => {
	// Serialize inputs to create a stable dependency for useMemo
	const inputsKey = useMemo(
		() =>
			inputs
				.map(({ tokenId, plancks }) => `${tokenId}:${plancks ?? "null"}`)
				.join(","),
		[inputs],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: inputsKey is a serialized representation of inputs
	const obs = useMemo(() => getStablePlancksMulti$(inputs), [inputsKey]);

	return useObservable(obs, DEFAULT_VALUE);
};
