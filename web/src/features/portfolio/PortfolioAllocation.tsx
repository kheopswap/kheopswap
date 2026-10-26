import type { FC } from "react";
import { CountUpDecimals } from "../../components/CountUpDecimals";
import { Shimmer } from "../../components/Shimmer";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip/Tooltip";
import { getChainById } from "../../registry/chains/chains";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";
import { plancksToTokens } from "../../utils/plancks";
import { shortenChainName } from "../../utils/shortenChainName";
import { FALLBACK_LOGO_SRC, getValidTokenLogo } from "../../utils/tokenLogo";
import { TEXT_COLOR } from "./getAllocation";
import { usePortfolio } from "./PortfolioProvider";

const AMOUNT_CLASS_NAME =
	"font-extralight font-mono text-6xl leading-none tracking-[-0.07em] sm:text-[88px]";

export const formatShare = (share: number) =>
	share > 0 && share < 0.005 ? "< 1%" : `${Math.round(share * 100)}%`;

export const getLegendLabels = (tokens: Token[]) => {
	const symbolCounts = new Map<string, number>();
	for (const { symbol } of tokens)
		symbolCounts.set(symbol, (symbolCounts.get(symbol) ?? 0) + 1);
	return tokens.map(({ symbol, chainId }) =>
		(symbolCounts.get(symbol) ?? 0) > 1
			? `${symbol} (${shortenChainName(getChainById(chainId).name)})`
			: symbol,
	);
};

const Explained: FC<{ children: string; explanation: string }> = ({
	children,
	explanation,
}) => (
	<Tooltip>
		<TooltipTrigger render={<span />}>
			<span className="underline decoration-dotted">{children}</span>
		</TooltipTrigger>
		<TooltipContent>{explanation}</TooltipContent>
	</Tooltip>
);

const pluralTokens = (count: number) => (count === 1 ? "token" : "tokens");

const ExcludedHoldings: FC<{
	lowLiquidityCount: number;
	unpricedCount: number;
}> = ({ lowLiquidityCount, unpricedCount }) => {
	if (!lowLiquidityCount && !unpricedCount) return null;
	return (
		<>
			, not counting{" "}
			{lowLiquidityCount > 0 && (
				<>
					{lowLiquidityCount} {pluralTokens(lowLiquidityCount)} with{" "}
					<Explained explanation="Their pools are too thin to value these holdings reliably.">
						low liquidity
					</Explained>
				</>
			)}
			{lowLiquidityCount > 0 && unpricedCount > 0 && " and "}
			{unpricedCount > 0 && (
				<>
					{unpricedCount} {pluralTokens(unpricedCount)}{" "}
					<Explained explanation="No Asset Hub pool prices these tokens.">
						without a price
					</Explained>
				</>
			)}
		</>
	);
};

const LegendItem: FC<{
	token?: Token;
	label: string;
	share: number;
	isLoading: boolean;
}> = ({ token, label, share, isLoading }) => (
	<li className="flex items-center gap-1.75 text-muted">
		{token ? (
			<img
				src={getValidTokenLogo(token.logo) ?? FALLBACK_LOGO_SRC}
				alt=""
				className="size-4 rounded-full"
			/>
		) : (
			<span className="size-4 rounded-full bg-faint" />
		)}
		{label}
		<span
			className={cn(
				"font-medium font-mono text-text",
				isLoading && "animate-pulse",
			)}
		>
			{formatShare(share)}
		</span>
	</li>
);

export const PortfolioAllocation = () => {
	const {
		accounts,
		allocation,
		holdingsByTokenId,
		lowLiquidityCount,
		unpricedCount,
		isLoading,
	} = usePortfolio();
	const { stableToken } = useRelayChains();

	const accountsCount = accounts.length;

	const hasTotal = allocation.total > 0n;

	if (!accountsCount || (!isLoading && !hasTotal)) return null;

	const { slices, other } = allocation;
	const legendLabels = getLegendLabels(slices.map(({ token }) => token));

	return (
		<section className="mx-1 mt-3 mb-9">
			<div className="mb-3 text-[12.5px] text-muted">Total portfolio</div>
			<div className="flex items-baseline gap-3.5">
				{hasTotal ? (
					<span
						className={cn(
							AMOUNT_CLASS_NAME,
							"text-hero text-shadow-hero",
							isLoading && "animate-pulse",
						)}
					>
						<CountUpDecimals
							value={Number(
								plancksToTokens(allocation.total, stableToken.decimals),
							)}
						/>
					</span>
				) : (
					<Shimmer className={AMOUNT_CLASS_NAME}>0.0000</Shimmer>
				)}
				<span className="font-medium font-mono text-lg text-muted sm:text-[22px]">
					{stableToken.symbol}
				</span>
			</div>
			<p className="mt-2.5 text-sm text-muted">
				Held across {accountsCount}{" "}
				{accountsCount === 1 ? "account" : "accounts"}
				<ExcludedHoldings
					lowLiquidityCount={lowLiquidityCount}
					unpricedCount={unpricedCount}
				/>
			</p>
			{hasTotal ? (
				<>
					<div className="mt-7 flex h-3.5 gap-0.75" aria-hidden>
						{slices.map(({ token, share }) => {
							const color = holdingsByTokenId[token.id]?.color ?? TEXT_COLOR;
							return (
								<span
									key={token.id}
									className="min-w-1.5 rounded-[3px]"
									style={{
										flex: share * 100,
										backgroundColor: color,
										boxShadow: `0 0 24px -4px color-mix(in oklab, ${color} 70%, transparent)`,
									}}
								/>
							);
						})}
						{other && (
							<span
								className="min-w-1.5 rounded-[3px] bg-faint"
								style={{ flex: other.share * 100 }}
							/>
						)}
					</div>
					<ul className="mt-3.5 flex flex-wrap gap-x-5.5 gap-y-2 text-[13px]">
						{slices.map(({ token, share }, index) => (
							<LegendItem
								key={token.id}
								token={token}
								label={legendLabels[index] ?? token.symbol}
								share={share}
								isLoading={isLoading}
							/>
						))}
						{other && (
							<LegendItem
								label="Other"
								share={other.share}
								isLoading={isLoading}
							/>
						)}
					</ul>
				</>
			) : (
				<>
					<Shimmer className="mt-7 h-3.5 rounded-[3px]" />
					<Shimmer className="mt-3.5 w-fit text-[13px]">
						TKN 00% TKN 00% TKN 00%
					</Shimmer>
				</>
			)}
		</section>
	);
};
