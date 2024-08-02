import { useQuery } from "@tanstack/react-query";
import { SS58String, Transaction } from "polkadot-api";

import { safeQueryKeyPart } from "src/util";
import { KheopswapTxOptions } from "src/util/getTxOptions";

type UseEstimateFeeProps = {
	from: SS58String | null | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	call: Transaction<any, any, any, any> | null | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
	});
};
