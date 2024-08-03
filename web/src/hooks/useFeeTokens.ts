import { useMemo } from "react";

import { useTokensByChainId } from "./useTokensByChainId";

import { values } from "lodash";
import type { ChainId } from "src/config/chains";

type UseFeeTokensProps = {
	chainId: ChainId | null | undefined;
};

export const useFeeTokens = ({ chainId }: UseFeeTokensProps) => {
	const { isLoading, data: tokens } = useTokensByChainId({ chainId });

	const data = useMemo(
		() => values(tokens)?.filter((token) => token.isSufficient),
		[tokens],
	);

	return { isLoading, data };
};
