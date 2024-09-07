import { useQuery } from "@tanstack/react-query";
import type { SS58String, Transaction } from "polkadot-api";

import { safeQueryKeyPart } from "src/util";
import type { KheopswapTxOptions } from "src/util/getTxOptions";

type UseEstimateFeeProps = {
	from: SS58String | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	call: Transaction<any, any, any, any> | null | undefined;
	options?: KheopswapTxOptions;
};

export const useEstimateFee = ({
	from,
	call,
	options,
}: UseEstimateFeeProps) => {
	return useQuery({
		queryKey: [
			"useEstimateFee",
			from,
			safeQueryKeyPart(call?.decodedCall),
			safeQueryKeyPart(options),
		],
		queryFn: () => {
			if (!from || !call) return null;

			return call.getEstimatedFees(from, options);
		},
		retry: 1,
		refetchInterval: false,
		structuralSharing: false,
	});
};
