import { useMemo } from "react";
import { getChainById } from "../registry/chains/chains";
import type { ChainId } from "../registry/chains/types";
import { shortenChainName } from "../utils/shortenChainName";

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
