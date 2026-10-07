import { type FC, useMemo, useState } from "react";
import { AccountSelect } from "../../../components/AccountSelect";
import { FormFieldContainer } from "../../../components/FormFieldContainer";
import { Pulse } from "../../../components/Pulse";
import { Shimmer } from "../../../components/Shimmer";
import { Styles } from "../../../components/styles";
import { TokenLogo } from "../../../components/TokenLogo";
import { Tokens } from "../../../components/Tokens";
import { useStablePlancks } from "../../../hooks/useStablePrice";
import { cn } from "../../../utils/cn";
import { isBigInt } from "../../../utils/isBigInt";
import { AddLiquidity } from "./addLiquidity/AddLiquidity";
import { useLiquidityPoolPage } from "./LiquidityPoolPageProvider";
import { RemoveLiquidity } from "./removeLiquidity/RemoveLiquidity";
import { usePoolValuation } from "./usePoolValuation";

const PoolReserves: FC = () => {
	const { reserves, isLoadingReserves, nativeToken, assetToken } =
		useLiquidityPoolPage();

	return (
		<Pulse
			pulse={isLoadingReserves}
			className="flex flex-col items-start gap-1 font-semibold"
		>
			<div className="flex items-center gap-1">
				{!!nativeToken && (
					<>
						<TokenLogo token={nativeToken} className="inline-block size-5" />
						<Tokens plancks={reserves?.[0] ?? 0n} token={nativeToken} />
					</>
				)}
			</div>
			<div className="flex items-center gap-1">
				{!!assetToken && (
					<>
						<TokenLogo token={assetToken} className="inline-block size-5" />
						<Tokens plancks={reserves?.[1] ?? 0n} token={assetToken} />
					</>
				)}
			</div>
		</Pulse>
	);
};

const PoolValue: FC = () => {
	const { pool } = useLiquidityPoolPage();

	const { valuation, isLoading, stableToken } = usePoolValuation({ pool });

	if (!isBigInt(valuation) && isLoading)
		return (
			<div>
				<Shimmer className="inline-block">0.0000 USDC</Shimmer>
			</div>
		);

	if (!isBigInt(valuation)) return <div>N/A</div>;

	if (!stableToken) return null;

	return (
		<div className="flex items-center gap-1">
			<TokenLogo token={stableToken} className="inline-block size-5" />
			<Tokens plancks={valuation} token={stableToken} pulse={isLoading} />
		</div>
	);
};

const PoolPosition: FC = () => {
	const {
		nativeToken,
		position,
		isLoadingPosition,
		isLoadingToken,
		assetToken,
	} = useLiquidityPoolPage();

	return (
		<Pulse
			pulse={isLoadingPosition || isLoadingToken}
			className="flex flex-col items-start gap-1 font-semibold"
		>
			<div className="flex items-center gap-1">
				{!!nativeToken && (
					<>
						<TokenLogo token={nativeToken} className="inline-block size-4" />
						<Tokens plancks={position?.reserves[0] ?? 0n} token={nativeToken} />
					</>
				)}
			</div>
			<div className="flex items-center gap-1">
				{!!assetToken && (
					<>
						<TokenLogo token={assetToken} className="inline-block size-4" />
						<Tokens plancks={position?.reserves[1] ?? 0n} token={assetToken} />
					</>
				)}
			</div>
		</Pulse>
	);
};

const PoolPositionValue: FC = () => {
	const { pool, position, isLoadingPosition } = useLiquidityPoolPage();

	const {
		stablePlancks: stablePlancks1,
		stableToken,
		isLoading: isLoading1,
	} = useStablePlancks({
		tokenId: pool?.tokenIds[0],
		plancks: position?.reserves[0],
	});
	const { stablePlancks: stablePlancks2, isLoading: isLoading2 } =
		useStablePlancks({
			tokenId: pool?.tokenIds[1],
			plancks: position?.reserves[1],
		});

	const [isLoading, total] = useMemo(() => {
		return [
			isLoadingPosition || isLoading1 || isLoading2,
			!isBigInt(stablePlancks1) || !isBigInt(stablePlancks2)
				? null
				: stablePlancks1 + stablePlancks2,
		];
	}, [
		isLoading1,
		isLoading2,
		isLoadingPosition,
		stablePlancks1,
		stablePlancks2,
	]);

	const sharesRatio = useMemo(() => {
		if (!position || position.supply === 0n) return "N/A";
		const safePercent = (10000n * position.shares) / position.supply;
		const raw = `${(Number(safePercent) / 100).toFixed(2)}%`;
		return position.shares && raw === "0.00%" ? "<0.01%" : raw;
	}, [position]);

	if (position?.reserves.every((r) => r === 0n)) return <div>N/A</div>;

	if (!isBigInt(total) && isLoading)
		return (
			<div>
				<Shimmer className="inline-block">0.0000 USDC</Shimmer>
			</div>
		);

	if (!isBigInt(total)) return <div>N/A</div>;

	if (!stableToken) return null;

	return (
		<div className="flex w-full items-center gap-2 overflow-hidden">
			<div className="flex grow items-center gap-1">
				<TokenLogo token={stableToken} className="inline-block size-5" />
				<Tokens
					plancks={total ?? 0n}
					token={stableToken}
					className="truncate"
					pulse={isLoadingPosition}
				/>
			</div>
			<div className="shrink-0 grow text-right font-mono">{sharesRatio}</div>
		</div>
	);
};

export const LiquidityPoolForm = () => {
	const [action, setAction] = useState<"add" | "remove">("add");

	const { isLoadingToken, assetToken, defaultAccountId, setDefaultAccountId } =
		useLiquidityPoolPage();

	if (!assetToken) return isLoadingToken ? null : <div>Pool not found</div>; // TODO

	return (
		<div className="flex flex-col gap-5">
			<FormFieldContainer id="from-account" label="Account">
				<AccountSelect
					id="from-account"
					idOrAddress={defaultAccountId}
					ownedOnly
					onChange={setDefaultAccountId}
				/>
			</FormFieldContainer>
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="rounded-control bg-surface-2 px-4 py-3.5">
					<div className={cn(Styles.label, "mb-2")}>Pool liquidity</div>
					<PoolReserves />
					<div className={cn(Styles.label, "mt-3 mb-2")}>Est. Value</div>
					<div className="font-semibold">
						<PoolValue />
					</div>
				</div>
				<div className="rounded-control bg-surface-2 px-4 py-3.5">
					<div className={cn(Styles.label, "mb-2")}>Your position</div>
					<PoolPosition />
					<div className={cn(Styles.label, "mt-3 mb-2")}>Est. Value</div>
					<div className="font-semibold">
						<PoolPositionValue />
					</div>
				</div>
			</div>
			<div className="grid h-11 grid-cols-2 rounded-control bg-surface-2 p-1">
				<button
					type="button"
					onClick={() => setAction("add")}
					className={cn(
						"rounded-chip font-medium text-muted",
						action === "add" && "bg-hover text-text",
					)}
				>
					Add
				</button>
				<button
					type="button"
					onClick={() => setAction("remove")}
					className={cn(
						"rounded-chip font-medium text-muted",
						action === "remove" && "bg-hover text-text",
					)}
				>
					Remove
				</button>
			</div>
			{action === "add" && <AddLiquidity />}
			{action === "remove" && <RemoveLiquidity />}
		</div>
	);
};
