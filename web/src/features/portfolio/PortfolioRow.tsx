import { type FC, useMemo } from "react";

import { TokenBalancesSummary } from "./PortfolioDataCell";
import type { PortfolioRowData, PortfolioVisibleCol } from "./types";

import { cn } from "@kheopswap/utils";
import { Styles, TokenLogo } from "src/components";
import { useNativeToken } from "src/hooks";
import { useRelayChains } from "src/state";
import { getTokenDescription } from "src/util";

type PortfolioRowProps = PortfolioRowData & {
	visibleCol: PortfolioVisibleCol;
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
	const description = useMemo(() => getTokenDescription(token), [token]);

	return (
		<button
			type="button"
			className={cn(
				Styles.button,
				"grid  h-16 items-center gap-2 rounded-md bg-primary-950/50 px-2 pl-3 pr-3 text-left enabled:hover:bg-primary-900/50 sm:gap-4",
				"grid-cols-[1fr_120px] sm:grid-cols-[1fr_120px_120px]",
			)}
			onClick={onClick}
		>
			<div className="flex items-center gap-2 overflow-hidden sm:gap-3 h-full pl-1">
				<TokenLogo className="inline-block size-10" token={token} />
				<div className="flex grow flex-col items-start overflow-hidden">
					<div className="w-full truncate">{token.symbol}</div>
					<div className="w-full truncate text-sm text-neutral-500">
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
};
