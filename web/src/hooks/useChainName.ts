import { useMemo } from "react";

import { type ChainId, getChainById } from "@kheopswap/registry";
import { shortenChainName } from "@kheopswap/utils";

type UseChainNameProps = {
	chainId: ChainId | null | undefined;
};

export const useChainName = ({ chainId }: UseChainNameProps) => {
	const [name, shortName] = useMemo(() => {
		const chainDef = chainId ? getChainById(chainId) : null;
		return chainDef
			? [chainDef.name, shortenChainName(chainDef.name)]
			: [undefined, undefined];
	}, [chainId]);

	return { name, shortName };
};
