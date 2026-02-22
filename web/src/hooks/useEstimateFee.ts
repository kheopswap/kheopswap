import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import type { AnyTransaction } from "../types/transactions";
import type { TxOptionsWithChargeAssetTxPayment } from "../utils/getTxOptions";
import { safeQueryKeyPart } from "../utils/safeQueryKeyPart";

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
