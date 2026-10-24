import { useMemo } from "react";
import { useAssetConvertPlancks } from "../../../../hooks/useAssetConvertPlancks";
import { usePoolReservesByTokenIds } from "../../../../hooks/usePoolReservesByTokenIds";
import { useRelayChains } from "../../../../state/relay";
import { getPriceImpact } from "../../../../utils/ammMath";
import { useAssetConvertionLPFee } from "../../useAssetConvertionLPFee";
import {
	type AmmPath,
	type AmmPathQuote,
	getLastHop,
	getPathLiquidity,
	quoteAmmPath,
} from "./ammPath";

type AmmPathQuoteState = {
	quote: AmmPathQuote | undefined;
	priceImpact: number | undefined;
	isLoading: boolean;
	errorMessage: string | null;
};

export const useAmmPathQuote = ({
	path,
	plancksIn,
	totalIn,
	slippage,
}: {
	path: AmmPath | null;
	plancksIn: bigint | null | undefined;
	totalIn: bigint | null | undefined;
	slippage: number;
}): AmmPathQuoteState => {
	const { assetHub } = useRelayChains();
	const firstReserves = usePoolReservesByTokenIds({
		tokenId1: path?.[0].tokenIdIn,
		tokenId2: path?.[0].tokenIdOut,
	});
	const secondReserves = usePoolReservesByTokenIds({
		tokenId1: path?.[1]?.tokenIdIn,
		tokenId2: path?.[1]?.tokenIdOut,
	});
	const { data: lpFee, isLoading: isLoadingLpFee } = useAssetConvertionLPFee({
		chain: assetHub,
	});
	const { plancksOut: spotPlancksOut } = useAssetConvertPlancks({
		tokenIdIn: path?.[0].tokenIdIn,
		tokenIdOut: path && getLastHop(path).tokenIdOut,
		plancks: totalIn,
	});

	const liquidity = useMemo(
		() => path && getPathLiquidity(path, firstReserves, secondReserves),
		[path, firstReserves, secondReserves],
	);

	const quote = useMemo(
		() =>
			liquidity?.status === "available" && lpFee !== undefined && plancksIn
				? quoteAmmPath({ hops: liquidity.hops, lpFee, plancksIn, slippage })
				: undefined,
		[liquidity, lpFee, plancksIn, slippage],
	);

	const priceImpact = useMemo(
		() =>
			spotPlancksOut && quote
				? getPriceImpact(spotPlancksOut, quote.amountOut)
				: undefined,
		[spotPlancksOut, quote],
	);

	return {
		quote,
		priceImpact,
		isLoading: liquidity?.status === "loading" || isLoadingLpFee,
		errorMessage: liquidity?.status === "unavailable" ? liquidity.reason : null,
	};
};
