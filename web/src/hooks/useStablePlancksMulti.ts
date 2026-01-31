import type { TokenId } from "@kheopswap/registry";
import { getCachedObservable$ } from "@kheopswap/utils";
import { bind } from "@react-rxjs/core";
import { map, type Observable, switchMap } from "rxjs";
import { getAssetConvertMulti$ } from "src/state/convert";
import { stableToken$ } from "src/state/relay";
import type { LoadingState } from "src/types";
import { getAssetHubMirrorTokenId } from "src/util";

type UseStablePlancksProps = {
	inputs: { tokenId: TokenId; plancks: bigint | undefined }[];
};

type StablePlancksItem = {
	stablePlancks: bigint | null;
	isLoadingStablePlancks: boolean;
};

type UseStablePlancksResult = LoadingState<StablePlancksItem[]>;

// Parse inputs from serialized key
const parseInputsKey = (
	key: string,
): { tokenId: TokenId; plancks: bigint | undefined }[] => {
	if (!key) return [];
	return key.split(",,").map((item) => {
		const [tokenId, plancksStr] = item.split("||");
		return {
			tokenId: tokenId as TokenId,
			plancks: plancksStr === "null" ? undefined : BigInt(plancksStr as string),
		};
	});
};

const getStablePlancksMulti$ = (
	inputsKey: string,
): Observable<UseStablePlancksResult> => {
	const inputs = parseInputsKey(inputsKey);

	return getCachedObservable$("getStablePlancksMulti$", inputsKey, () =>
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

const DEFAULT_VALUE: UseStablePlancksResult = { isLoading: true, data: [] };

// bind() only receives the serialized key
const [useStablePlancksMultiInternal] = bind(
	(inputsKey: string) => getStablePlancksMulti$(inputsKey),
	DEFAULT_VALUE,
);

export const useStablePlancksMulti = ({
	inputs,
}: UseStablePlancksProps): UseStablePlancksResult => {
	// Serialize inputs to create a stable key for bind's internal caching (use || and ,, as separators since tokenIds contain ::)
	const inputsKey = inputs
		.map(({ tokenId, plancks }) => `${tokenId}||${plancks ?? "null"}`)
		.join(",,");

	return useStablePlancksMultiInternal(inputsKey);
};
