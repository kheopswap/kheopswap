import { useMemo } from "react";

import { useRelayChains } from "./useRelayChains";
import { useAssetConvertMulti } from "./useAssetConvertMulti";

import { TokenId } from "src/config/tokens";
import { getAssetHubMirrorTokenId } from "src/util";

type UseStablePlancksProps = {
	inputs: { tokenId: TokenId; plancks: bigint | undefined }[];
};

type UseStablePlancksResult = {
	isLoading: boolean;
	data: { stablePlancks: bigint | null; isLoadingStablePlancks: boolean }[];
};

export const useStablePlancksMulti = ({
	inputs,
}: UseStablePlancksProps): UseStablePlancksResult => {
	const { stableToken } = useRelayChains();

	const convertInputs = useMemo(
		() =>
			inputs.map(({ tokenId, plancks }) => ({
				tokenIdIn: getAssetHubMirrorTokenId(tokenId),
				plancksIn: plancks ?? 0n,
				tokenIdOut: stableToken.id,
			})),
		[inputs, stableToken.id],
	);

	const { data: outputs, isLoading } = useAssetConvertMulti({
		inputs: convertInputs,
	});

	const data = useMemo(
		() =>
			outputs.map(({ plancksOut, isLoading }) => ({
				stablePlancks: plancksOut,
				isLoadingStablePlancks: isLoading,
			})),
		[outputs],
	);

	return { data, isLoading };
};
