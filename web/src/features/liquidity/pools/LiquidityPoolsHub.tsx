import { keyBy } from "lodash-es";
import { type FC, useId, useMemo, useRef } from "react";
import { Link } from "react-router";
import { CountUpDecimals } from "../../../components/CountUpDecimals";
import { Shimmer } from "../../../components/Shimmer";
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

const SKELETON_SPOKES = getHubSpokes(
	Array.from({ length: 14 }, (_, rank) => ({
		poolAssetId: rank,
		valuation: BigInt((14 - rank) ** 3),
	})),
	{ rMin: R_MIN, rMax: R_MAX },
);
const SKELETON_SWEEP_MS = 2000;

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
	isLoadingTvl: boolean;
	stableSymbol: string;
	roundClipPath: string;
}> = ({ spoke, pool, tvl, isLoadingTvl, stableSymbol, roundClipPath }) => {
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
			<title>{`${pool.token2.symbol} ${tvl} ${stableSymbol}`}</title>
			<line
				x1={start.x}
				y1={start.y}
				x2={tip.x}
				y2={tip.y}
				className="stroke-transparent stroke-[8]"
			/>
			<line
				x1={start.x}
				y1={start.y}
				x2={tip.x}
				y2={tip.y}
				className={cn(
					"group-hover:stroke-text group-focus-visible:stroke-text",
					isLabelled
						? "stroke-[1.25] stroke-primary/90 drop-shadow-spoke"
						: "stroke-1 stroke-grid/25",
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
							hasPosition ? "stroke-[1.5] stroke-text" : "stroke-grid/30",
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
						className="fill-hub-dot group-hover:fill-text"
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
					<tspan
						className={cn(
							"fill-muted font-mono text-[11.5px] font-medium",
							isLoadingTvl && "animate-pulse",
						)}
					>
						{tvl}
					</tspan>
				</text>
			)}
		</Link>
	);
};

const getSweepDelay = (angle: number) => {
	const turn = (angle + Math.PI / 2) / (2 * Math.PI);
	return `${Math.round((turn - Math.floor(turn)) * SKELETON_SWEEP_MS)}ms`;
};

const SkeletonSpoke: FC<{ spoke: HubSpoke }> = ({
	spoke: { angle, radius, rank },
}) => {
	const start = polar(angle, SPOKE_START);
	const tip = polar(angle, radius);
	const label = polar(angle, radius + LABEL_OFFSET);
	const tipSize = getTipSize(rank);
	const labelAnchor = getLabelAnchor(angle);
	const labelWidth = 72;
	const labelX =
		labelAnchor === "start"
			? label.x
			: labelAnchor === "end"
				? label.x - labelWidth
				: label.x - labelWidth / 2;

	return (
		<g
			className="motion-safe:animate-pulse"
			style={{ animationDelay: getSweepDelay(angle) }}
		>
			<line
				x1={start.x}
				y1={start.y}
				x2={tip.x}
				y2={tip.y}
				className="stroke-hover stroke-[1.25]"
			/>
			<circle
				cx={tip.x}
				cy={tip.y}
				r={tipSize ? tipSize / 2 + 3 : 2.5}
				className="fill-hover"
			/>
			{rank < LABELLED_RANKS && (
				<rect
					x={labelX}
					y={label.y - 6}
					width={labelWidth}
					height={12}
					rx={3}
					className="fill-hover"
				/>
			)}
		</g>
	);
};

export const LiquidityPoolsHub: FC<{
	pools: LiquidityPoolRowData[];
	isLoading: boolean;
	isLoadingValuations: boolean;
}> = ({ pools: livePools, isLoading, isLoadingValuations }) => {
	const { assetHub, stableToken } = useRelayChains();
	const nativeToken = useNativeToken({ chain: assetHub });
	const glowId = useId();
	const roundClipId = useId();

	const lastValuations = useRef(new Map<string, bigint>());
	const pools = useMemo(
		() =>
			livePools.map((pool) => {
				const key = `${pool.chainId}:${pool.poolAssetId}`;
				if (pool.valuation !== null) {
					lastValuations.current.set(key, pool.valuation);
					return pool;
				}
				const valuation = lastValuations.current.get(key);
				return valuation === undefined ? pool : { ...pool, valuation };
			}),
		[livePools],
	);

	const spokes = useMemo(
		() =>
			getHubSpokes(pools, {
				rMin: R_MIN,
				rMax: R_MAX,
			}),
		[pools],
	);

	const poolsById = useMemo(() => keyBy(pools, "poolAssetId"), [pools]);

	const totalTvl = useMemo(
		() => pools.reduce((acc, pool) => acc + (pool.valuation ?? 0n), 0n),
		[pools],
	);

	const hasTvl = pools.length >= MIN_POOLS && totalTvl > 0n;
	const isLoaded = !isLoading && !isLoadingValuations;

	if (isLoaded && !hasTvl) return null;

	const formatTvl = (plancks: bigint | null) =>
		formatDecimals(plancksToTokens(plancks ?? 0n, stableToken.decimals), 4);

	const summary = `${pools.length} pools, every one paired with ${nativeToken.symbol}.`;

	return (
		<section className="mb-7 grid items-center gap-6 px-1 md:grid-cols-[300px_1fr]">
			<div>
				<div className="mb-3 text-[12.5px] text-muted">Total value locked</div>
				<div className="font-extralight font-mono text-5xl leading-none tracking-[-0.07em] sm:text-[64px]">
					{hasTvl ? (
						<>
							<span
								className={cn(
									"text-hero text-shadow-hero",
									!isLoaded && "animate-pulse",
								)}
							>
								<CountUpDecimals
									value={Number(
										plancksToTokens(totalTvl, stableToken.decimals),
									)}
								/>
							</span>
							<span className="ml-2.5 text-lg tracking-normal text-muted">
								{stableToken.symbol}
							</span>
						</>
					) : (
						<Shimmer className="inline-block">0.0000</Shimmer>
					)}
				</div>
				{pools.length ? (
					<p className="mt-3.5 max-w-[32ch] text-sm text-muted">{summary}</p>
				) : (
					<Shimmer className="mt-3.5 max-w-[32ch] text-sm">{summary}</Shimmer>
				)}
			</div>
			<svg
				aria-label={`Pools around ${nativeToken.symbol}`}
				viewBox={`0 0 ${SIZE} ${SIZE}`}
				className="mx-auto w-full max-w-[420px] overflow-visible md:max-w-[600px]"
			>
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
						className="fill-none stroke-grid/40"
					/>
				))}
				<circle cx={CENTER} cy={CENTER} r={120} fill={`url(#${glowId})`} />
				{!hasTvl &&
					SKELETON_SPOKES.map((spoke) => (
						<SkeletonSpoke key={spoke.poolAssetId} spoke={spoke} />
					))}
				{spokes.map((spoke) => {
					const pool = poolsById[spoke.poolAssetId];
					if (!hasTvl || !pool) return null;
					return (
						<HubSpokeLink
							key={spoke.poolAssetId}
							spoke={spoke}
							pool={pool}
							tvl={formatTvl(pool.valuation)}
							isLoadingTvl={!isLoaded}
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
