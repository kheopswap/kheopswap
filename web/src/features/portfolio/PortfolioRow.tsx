import { FC, useMemo } from "react";

import { PortfolioVisibleColunm, PortfolioRowData } from "./types";
import { TokenBalancesSummary } from "./PortfolioDataCell";

import { Styles, TokenLogo } from "src/components";
import { getChainById } from "src/config/chains";
import { cn } from "src/util";
import { useNativeToken, useRelayChains } from "src/hooks";

type PortfolioRowProps = PortfolioRowData & {
	visibleCol: PortfolioVisibleColunm;
	onClick: () => void;
};

export const PortfolioRow: FC<PortfolioRowProps> = ({
	token,
	balance,
	price,
	visibleCol,
	onClick,
}) => {
	const { assetHub, stableToken } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const chain = useMemo(() => getChainById(token.chainId), [token.chainId]);

	return (
		<button
			type="button"
			className={cn(
				Styles.button,
				"grid  h-16 items-center gap-2 rounded-md bg-primary-950/50 p-2 pl-4 pr-3 text-left enabled:hover:bg-primary-900/50 sm:gap-4",
				"grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
			)}
			onClick={onClick}
		>
			<div className="flex items-center gap-2 overflow-hidden  sm:gap-3">
				<TokenLogo className="inline-block size-10" token={token} />
				<div className="flex grow flex-col items-start overflow-hidden">
					<div className="w-full truncate">{token.symbol}</div>
					<div className="w-full truncate text-sm text-neutral-500">{`${chain.name}${token.type === "asset" ? ` - ${token.assetId}` : ""}`}</div>
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
						{...price}
					/>
				)}
			</div>
		</button>
	);
};
