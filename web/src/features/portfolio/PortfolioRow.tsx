import { type FC, memo, useCallback, useMemo } from "react";
import { TokenLogo } from "../../components/TokenLogo";
import { useNativeToken } from "../../hooks/useNativeToken";
import type { TokenId } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";
import { getTokenDescription } from "../../utils/getTokenDescription";
import { TokenBalancesSummary } from "./PortfolioDataCell";
import type { PortfolioRowData, PortfolioVisibleCol } from "./types";

type PortfolioRowProps = PortfolioRowData & {
	visibleCol: PortfolioVisibleCol;
	isFirst: boolean;
	onSelect: (tokenId: TokenId) => void;
};

export const PortfolioRow: FC<PortfolioRowProps> = memo(function PortfolioRow({
	token,
	balance,
	price,
	visibleCol,
	isFirst,
	onSelect,
}) {
	const { assetHub, stableToken } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const description = useMemo(() => getTokenDescription(token), [token]);

	const handleClick = useCallback(() => {
		onSelect(token.id);
	}, [onSelect, token.id]);

	return (
		<button
			type="button"
			className={cn(
				"grid h-17 grid-cols-[1fr_auto] items-center gap-x-4 px-1 text-left hover:bg-row-hover sm:grid-cols-[1fr_180px_180px]",
				!isFirst && "border-t border-line",
			)}
			onClick={handleClick}
		>
			<div className="flex h-full items-center gap-3 overflow-hidden">
				<TokenLogo className="inline-block size-8 shrink-0" token={token} />
				<div className="flex grow flex-col items-start overflow-hidden">
					<div className="w-full truncate font-semibold">{token.symbol}</div>
					<div className="w-full truncate text-xs text-muted">
						{description}
					</div>
				</div>
			</div>

			<div className={cn(visibleCol === "price" && "hidden sm:block")}>
				{!!balance && (
					<TokenBalancesSummary
						token={token}
						stableToken={stableToken}
						{...balance}
					/>
				)}
			</div>

			<div className={cn(visibleCol === "balance" && "hidden sm:block")}>
				{!!price && (
					<TokenBalancesSummary
						token={nativeToken}
						stableToken={stableToken}
						isPrice
						{...price}
					/>
				)}
			</div>
		</button>
	);
});
