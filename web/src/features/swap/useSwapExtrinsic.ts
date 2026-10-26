import { useQuery } from "@tanstack/react-query";
import type { SS58String } from "polkadot-api";
import { useRelayChains } from "../../state/relay";
import { getSwapExtrinsic } from "./getSwapTransaction";
import type { AmmPath } from "./routes/ammPath";
import { withAppCommission } from "./withAppCommission";

type UseSwapExtrinsic = {
	path: AmmPath | null | undefined;
	amountIn: bigint | null | undefined;
	amountOutMin: bigint | null | undefined;
	dest: SS58String | null | undefined;
	appCommission: bigint | null | undefined;
};

export const useSwapExtrinsic = ({
	path,
	amountIn,
	amountOutMin,
	dest,
	appCommission, // TODO should be computed by this hook?
}: UseSwapExtrinsic) => {
	const { assetHub } = useRelayChains();

	return useQuery({
		queryKey: [
			"useSwapExtrinsic",
			assetHub.id,
			path,
			amountIn?.toString(),
			amountOutMin?.toString(),
			dest,
			appCommission?.toString(),
		],
		queryFn: async () => {
			if (
				!path ||
				typeof amountIn !== "bigint" ||
				typeof amountOutMin !== "bigint" ||
				!dest
			)
				return null;

			const swapCall = await getSwapExtrinsic(
				assetHub.id,
				path,
				amountIn,
				amountOutMin,
				dest,
			);

			return withAppCommission(
				assetHub.id,
				swapCall,
				path[0].tokenIdIn,
				appCommission,
			);
		},
		refetchInterval: false,
		structuralSharing: false,
	});
};
