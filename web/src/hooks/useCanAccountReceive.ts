import type { SS58String } from "polkadot-api";
import { useMemo } from "react";

import { useBalance } from "./useBalance";
import { useExistentialDeposit } from "./useExistentialDeposit";

import type { TokenId } from "src/config/tokens";

type UseCanAccountReceiveProps = {
	address: SS58String;
	tokenId: TokenId | null | undefined;
	plancks: bigint | null | undefined;
};

export const useCanAccountReceive = ({
	address,
	tokenId,
	plancks,
}: UseCanAccountReceiveProps) => {
	const { data: existentialDeposit } = useExistentialDeposit({
		tokenId,
	});
	const { data: balance } = useBalance({ address, tokenId });

	const canReceive = useMemo(() => {
		if (!plancks) return false;
		if (typeof existentialDeposit !== "bigint") return false;
		if (existentialDeposit === 0n) return true;
		if (typeof balance !== "bigint") return false;
		return balance + plancks >= existentialDeposit;
	}, [balance, existentialDeposit, plancks]);

	return canReceive;
};
