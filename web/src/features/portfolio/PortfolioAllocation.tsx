import { uniqBy } from "lodash-es";
import { type FC, useMemo } from "react";
import { CountUpDecimals } from "../../components/CountUpDecimals";
import { Shimmer } from "../../components/Shimmer";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { cn } from "../../utils/cn";
import { plancksToTokens } from "../../utils/plancks";
import { FALLBACK_LOGO_SRC, getValidTokenLogo } from "../../utils/tokenLogo";
import { TEXT_COLOR } from "./getAllocation";
import { usePortfolio } from "./PortfolioProvider";

const AMOUNT_CLASS_NAME =
	"font-extralight font-mono text-6xl leading-none tracking-[-0.07em] sm:text-[88px]";

const formatShare = (share: number) => `${Math.round(share * 100)}%`;

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
	const { accounts, allocation, holdingsByTokenId, isLoading } = usePortfolio();
	const { stableToken } = useRelayChains();

	const accountsCount = useMemo(
		() => uniqBy(accounts, "address").length,
		[accounts],
	);

	const hasTotal = allocation.total > 0n;

	if (!accountsCount || (!isLoading && !hasTotal)) return null;

	const { slices, other } = allocation;

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
						{slices.map(({ token, share }) => (
							<LegendItem
								key={token.id}
								token={token}
								label={token.symbol}
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
