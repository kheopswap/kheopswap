import { useMemo } from "react";

import type { TokenId } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { useObservable } from "react-rx";
import { getAssetConvertMulti$ } from "src/state/convert";

export type AssetConvertInput = {
	tokenIdIn: TokenId;
	plancksIn: bigint;
	tokenIdOut: TokenId;
};

export type UseAssetConvertMultiProps = {
	inputs: AssetConvertInput[];
};

type AssetConvertResult = AssetConvertInput & {
	plancksOut: bigint | null;
	isLoading: boolean;
};

type AssetConvertMultiResult = {
	data: AssetConvertResult[];
	isLoading: boolean;
};

const DEFAULT_VALUE = { data: [], isLoading: true };

export const useAssetConvertMulti = ({
	inputs,
}: UseAssetConvertMultiProps): AssetConvertMultiResult => {
	const stop = logger.cumulativeTimer("useAssetConvertMulti");

	const obs = useMemo(() => getAssetConvertMulti$(inputs), [inputs]);

	const outputs = useObservable(obs, DEFAULT_VALUE);

	stop();

	return outputs;
};
