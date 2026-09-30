import { map, type Observable, switchMap } from "rxjs";
import type { TokenId } from "../registry/tokens/types";
import { getAssetConvertMulti$ } from "../state/convert";
import { stableToken$ } from "../state/relay";
import { bindSerialized } from "../utils/bindSerialized";
import { getAssetHubMirrorTokenId } from "../utils/getAssetHubMirrorTokenId";

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

const useStablePlancksByInputs = bindSerialized(
	({ inputs }: UseStablePlancksProps) => getStablePlancksMulti$(inputs),
	(): UseStablePlancksResult => ({ isLoading: true, data: [] }),
);

export const useStablePlancksMulti = ({
	inputs,
}: UseStablePlancksProps): UseStablePlancksResult =>
	useStablePlancksByInputs({
		inputs: inputs.map(({ tokenId, plancks }) => ({ tokenId, plancks })),
	});
