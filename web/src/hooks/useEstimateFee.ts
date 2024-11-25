import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api-test";

import { safeQueryKeyPart } from "@kheopswap/utils";
import type { AnyTransaction } from "src/types";
import type { TxOptionsWithChargeAssetTxPayment } from "src/util/getTxOptions";

type UseEstimateFeeProps = {
	from: SS58String | null | undefined;
	call: AnyTransaction | null | undefined;
	options?: TxOptionsWithChargeAssetTxPayment;
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
