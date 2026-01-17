import { getApi } from "@kheopswap/papi";
import { type Chain, isAssetHub } from "@kheopswap/registry";
import { logger } from "@kheopswap/utils";
import { useQuery } from "@tanstack/react-query";

type UseAssetConvertionLPFeeProps = { chain: Chain };

export const useAssetConvertionLPFee = ({
	chain,
}: UseAssetConvertionLPFeeProps) => {
	const query = useQuery({
		queryKey: ["useAssetConvertionLPFee", chain.id],
		queryFn: async () => {
			if (!isAssetHub(chain)) return null;
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
