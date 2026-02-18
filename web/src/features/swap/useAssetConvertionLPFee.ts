import { useQuery } from "@tanstack/react-query";
import { getApi } from "../../papi/getApi";
import type { Chain } from "../../registry/chains/types";
import { logger } from "../../utils/logger";

type UseAssetConvertionLPFeeProps = { chain: Chain };

export const useAssetConvertionLPFee = ({
	chain,
}: UseAssetConvertionLPFeeProps) => {
	const query = useQuery({
		queryKey: ["useAssetConvertionLPFee", chain.id],
		queryFn: async () => {
			const api = await getApi(chain.id);

			const stop = logger.timer(
				`chain.api.constants.AssetConversion.LPFee() - ${chain.id}`,
			);
			const res = await api.constants.AssetConversion.LPFee();
			stop();
			return res;
		},
		structuralSharing: false,
	});

	return query;
};
