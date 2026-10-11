import { keyBy } from "lodash-es";
import { type FC, useId, useMemo } from "react";
import { Link } from "react-router";
import { useNativeToken } from "../../../hooks/useNativeToken";
import type { Token } from "../../../registry/tokens/types";
import { useRelayChains } from "../../../state/relay";
import { cn } from "../../../utils/cn";
import { formatDecimals } from "../../../utils/formatDecimals";
import { plancksToTokens } from "../../../utils/plancks";
import { FALLBACK_LOGO_SRC, getValidTokenLogo } from "../../../utils/tokenLogo";
import { getHubSpokes, type HubSpoke } from "./getHubSpokes";
import type { LiquidityPoolRowData } from "./useLiquidityPools";

const MIN_POOLS = 3;
const SIZE = 640;
const CENTER = SIZE / 2;
const R_MIN = 92;
const R_MAX = 290;
const SPOKE_START = 46;
const HUB_LOGO_SIZE = 68;
const LABEL_OFFSET = 30;
const LABELLED_RANKS = 6;
const LOGO_RANKS = 16;

const getTipSize = (rank: number) =>
	rank < LABELLED_RANKS ? 28 : rank < LOGO_RANKS ? 18 : 0;

const polar = (angle: number, radius: number) => ({
	x: CENTER + Math.cos(angle) * radius,
	y: CENTER + Math.sin(angle) * radius,
});

const getLabelAnchor = (angle: number) => {
	const cos = Math.cos(angle);
	return cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle";
};

const SvgTokenLogo: FC<{
	token: Token;
	x: number;
	y: number;
	size: number;
	roundClipPath: string;
}> = ({ token, x, y, size, roundClipPath }) => {
	const logo = getValidTokenLogo(token.logo);
	return (
		<image
			href={logo ?? FALLBACK_LOGO_SRC}
			x={x - size / 2}
			y={y - size / 2}
			width={size}
			height={size}
			clipPath={logo?.endsWith("?rounded") ? roundClipPath : undefined}
		/>
	);
};

const HubSpokeLink: FC<{
	spoke: HubSpoke;
	pool: LiquidityPoolRowData;
	tvl: string;
	stableSymbol: string;
	roundClipPath: string;
}> = ({ spoke, pool, tvl, stableSymbol, roundClipPath }) => {
	const { angle, radius, rank } = spoke;
	const start = polar(angle, SPOKE_START);
	const tip = polar(angle, radius);
	const label = polar(angle, radius + LABEL_OFFSET);
	const tipSize = getTipSize(rank);
	const isLabelled = rank < LABELLED_RANKS;
	const hasPosition = pool.totalPositionsValuation > 0n;

	return (
		<Link
			to={pool.poolAssetId.toString()}
			aria-label={`${pool.token1.symbol}/${pool.token2.symbol} pool, ${tvl} ${stableSymbol}`}
			className="group outline-none"
		>
			<line
				x1={start.x}
				y1={start.y}
				x2={tip.x}
				y2={tip.y}
				className={cn(
					"group-hover:stroke-text group-focus-visible:stroke-text",
					isLabelled
						? "stroke-[1.25] stroke-primary/90"
						: "stroke-1 stroke-muted/35",
				)}
			/>
			{tipSize ? (
				<>
					<circle
						cx={tip.x}
						cy={tip.y}
						r={tipSize / 2 + 3}
						className={cn(
							"fill-page",
							hasPosition ? "stroke-[1.5] stroke-text" : "stroke-line",
						)}
					/>
					<SvgTokenLogo
						token={pool.token2}
						x={tip.x}
						y={tip.y}
						size={tipSize}
						roundClipPath={roundClipPath}
					/>
				</>
			) : (
				<>
					{hasPosition && (
						<circle
							cx={tip.x}
							cy={tip.y}
							r={5}
							className="fill-none stroke-[1.5] stroke-text"
						/>
					)}
					<circle
						cx={tip.x}
						cy={tip.y}
						r={2.5}
						className="fill-muted group-hover:fill-text"
					/>
				</>
			)}
			{isLabelled && (
				<text
					x={label.x}
					y={label.y + 4}
					textAnchor={getLabelAnchor(angle)}
					className="fill-text font-sans text-[12.5px] font-semibold"
				>
					{pool.token2.symbol}{" "}
					<tspan className="fill-muted font-mono text-[11.5px] font-medium">
						{tvl}
					</tspan>
				</text>
			)}
		</Link>
	);
};

export const LiquidityPoolsHub: FC<{
	pools: LiquidityPoolRowData[];
	isLoading: boolean;
}> = ({ pools, isLoading }) => {
	const { assetHub, stableToken } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const glowId = useId();
	const roundClipId = useId();

	const spokes = useMemo(
		() =>
			getHubSpokes(pools, {
				stableDecimals: stableToken.decimals,
				rMin: R_MIN,
				rMax: R_MAX,
			}),
		[pools, stableToken.decimals],
	);

	const poolsById = useMemo(() => keyBy(pools, "poolAssetId"), [pools]);

	const totalTvl = useMemo(
		() => pools.reduce((acc, pool) => acc + (pool.valuation ?? 0n), 0n),
		[pools],
	);

	if (isLoading || pools.length < MIN_POOLS || !totalTvl) return null;

	const formatTvl = (plancks: bigint | null) =>
		formatDecimals(plancksToTokens(plancks ?? 0n, stableToken.decimals), 4);

	return (
		<section className="mb-7 grid items-center gap-6 px-1 md:grid-cols-[300px_1fr]">
			<div>
				<div className="font-light font-mono text-5xl leading-none tracking-[-0.07em] sm:text-[64px]">
					{formatTvl(totalTvl)}
					<span className="ml-2.5 text-lg tracking-normal text-muted">
						{stableToken.symbol}
					</span>
				</div>
				<p className="mt-3.5 max-w-[32ch] text-sm text-muted">
					{pools.length} pools, every one paired with {nativeToken.symbol}.
					Swaps route through {nativeToken.symbol}, so this is the whole market.
				</p>
				<p className="mt-3.5 text-[12.5px] text-faint">
					Longer spokes hold more liquidity.
				</p>
			</div>
			<svg
				viewBox={`0 0 ${SIZE} ${SIZE}`}
				className="mx-auto w-full max-w-[420px] overflow-visible md:max-w-[600px]"
			>
				<title>Pools around {nativeToken.symbol}</title>
				<defs>
					<radialGradient id={glowId}>
						<stop
							offset="0"
							stopColor="var(--color-primary)"
							stopOpacity={0.35}
						/>
						<stop offset="1" stopColor="var(--color-primary)" stopOpacity={0} />
					</radialGradient>
					<clipPath id={roundClipId} clipPathUnits="objectBoundingBox">
						<circle cx={0.5} cy={0.5} r={0.5} />
					</clipPath>
				</defs>
				{[R_MAX, (R_MIN + R_MAX) / 2].map((r) => (
					<circle
						key={r}
						cx={CENTER}
						cy={CENTER}
						r={r}
						strokeDasharray="2 5"
						className="fill-none stroke-line"
					/>
				))}
				<circle cx={CENTER} cy={CENTER} r={120} fill={`url(#${glowId})`} />
				{spokes.map((spoke) => {
					const pool = poolsById[spoke.poolAssetId];
					if (!pool) return null;
					return (
						<HubSpokeLink
							key={spoke.poolAssetId}
							spoke={spoke}
							pool={pool}
							tvl={formatTvl(pool.valuation)}
							stableSymbol={stableToken.symbol}
							roundClipPath={`url(#${roundClipId})`}
						/>
					);
				})}
				<SvgTokenLogo
					token={nativeToken}
					x={CENTER}
					y={CENTER}
					size={HUB_LOGO_SIZE}
					roundClipPath={`url(#${roundClipId})`}
				/>
			</svg>
		</section>
	);
};
