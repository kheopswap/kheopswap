import { uniqBy } from "lodash-es";
import { type FC, useMemo } from "react";
import { CountUpDecimals } from "../../components/CountUpDecimals";
import type { Token } from "../../registry/tokens/types";
import { useRelayChains } from "../../state/relay";
import { plancksToTokens } from "../../utils/plancks";
import { FALLBACK_LOGO_SRC, getValidTokenLogo } from "../../utils/tokenLogo";
import { TEXT_COLOR } from "./getAllocation";
import { usePortfolio } from "./PortfolioProvider";

const formatShare = (share: number) => `${Math.round(share * 100)}%`;

const LegendItem: FC<{ token?: Token; label: string; share: number }> = ({
	token,
	label,
	share,
}) => (
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
		<span className="font-medium font-mono text-text">
			{formatShare(share)}
		</span>
	</li>
);

export const PortfolioAllocation = () => {
	const { accounts, allocation, holdingsByTokenId } = usePortfolio();
	const { stableToken } = useRelayChains();

	const accountsCount = useMemo(
		() => uniqBy(accounts, "address").length,
		[accounts],
	);

	if (!accountsCount || !allocation.total) return null;

	const { slices, other } = allocation;

	return (
		<section className="mx-1 mt-3 mb-9">
			<div className="mb-3 text-[12.5px] text-muted">Total portfolio</div>
			<div className="flex items-baseline gap-3.5">
				<span className="font-light font-mono text-6xl leading-none tracking-[-0.07em] sm:text-[88px]">
					<CountUpDecimals
						value={Number(
							plancksToTokens(allocation.total, stableToken.decimals),
						)}
					/>
				</span>
				<span className="font-medium font-mono text-lg text-muted sm:text-[22px]">
					{stableToken.symbol}
				</span>
			</div>
			<p className="mt-2.5 text-sm text-muted">
				Held across {accountsCount}{" "}
				{accountsCount === 1 ? "account" : "accounts"}
			</p>
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
					/>
				))}
				{other && <LegendItem label="Other" share={other.share} />}
			</ul>
		</section>
	);
};
