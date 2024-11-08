import { useMemo } from "react";

import { useAssetConvertMulti } from "./useAssetConvertMulti";
import { useRelayChains } from "./useRelayChains";

import type { TokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
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
	const stop = logger.cumulativeTimer("useStablePlancksMulti");

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

	stop();

	return { data, isLoading };
};
