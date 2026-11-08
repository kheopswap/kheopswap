import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { type FC, Fragment } from "react";
import { cn } from "../../utils/cn";
import { formatPercent } from "../../utils/formatPercent";
import { TokenAmountValue } from "./routes/AmmPathValues";
import { getXcmChainNames } from "./routes/xcm/XcmQuoteRows";
import { useSwap } from "./SwapProvider";
import { useSwapRiskContext } from "./SwapRiskProvider";
import { isTransferRisk, type LossCause, type SwapLoss } from "./swapRisk";

const LossCauseText: FC<{ cause: LossCause | null }> = ({ cause }) => {
	const { details } = useSwap();
	const xcm = details.kind === "amm-swap" ? undefined : details;
	switch (cause) {
		case "delivery-fee":
			return xcm?.quote.deliveryFee ? (
				<>
					, mostly the <TokenAmountValue {...xcm.quote.deliveryFee} /> delivery
					fee
				</>
			) : null;
		case "destination-fee": {
			if (!xcm?.quote.data?.success) return null;
			const [, ...feeChainNames] = getXcmChainNames(xcm.route);
			return (
				<>
					, mostly the{" "}
					<TokenAmountValue {...xcm.quote.data.quote.destinationFee} /> fee on{" "}
					{feeChainNames.join(" and ")}
				</>
			);
		}
		case "price-impact":
			return ", mostly from price impact";
		case null:
			return null;
	}
};

const TransferFeesText: FC<{ ratio: number; cause: LossCause | null }> = ({
	ratio,
	cause,
}) => {
	const { tokenOut, swapPlancksOut } = useSwap();
	const { transferFees } = useSwapRiskContext();
	if (!transferFees?.fees.length || !tokenOut || !swapPlancksOut)
		return (
			<>
				Fees take {formatPercent(ratio)} of what you send
				<LossCauseText cause={cause} />.
			</>
		);
	return (
		<>
			You pay{" "}
			{transferFees.fees.map((fee, index) => (
				<Fragment key={fee.tokenId}>
					{index > 0 && " + "}
					<TokenAmountValue {...fee} />
				</Fragment>
			))}{" "}
			in fees ({transferFees.isPartial && "at least "}
			{formatPercent(ratio)} of what you send) to deliver{" "}
			<TokenAmountValue tokenId={tokenOut.id} plancks={swapPlancksOut} />.
		</>
	);
};

const LossText: FC<{ loss: SwapLoss; cause: LossCause | null }> = ({
	loss: { kind, ratio },
	cause,
}) => {
	switch (kind) {
		case "price-impact":
			return `Price impact is ${formatPercent(ratio)}: this trade moves the pool price against you.`;
		case "value-loss":
			return (
				<>
					You receive {formatPercent(ratio)} less value than you send
					<LossCauseText cause={cause} />.
				</>
			);
		case "fees":
			return <TransferFeesText ratio={ratio} cause={cause} />;
	}
};

export const SwapRiskWarning = () => {
	const { risk, isAcknowledged, onAcknowledgeChange } = useSwapRiskContext();
	if (risk.level === "none") return null;

	const needsConfirmation = risk.level === "confirm";

	return (
		<div
			role="alert"
			className={cn(
				"flex flex-col gap-2.5 rounded-control border p-3 text-sm",
				needsConfirmation
					? "border-error/30 bg-error/10 text-error"
					: "border-warn/30 bg-warn/10 text-warn",
			)}
		>
			<div className="flex gap-2">
				<ExclamationTriangleIcon className="size-5 shrink-0" />
				<p>
					<LossText loss={risk.headline} cause={risk.cause} />
				</p>
			</div>
			{needsConfirmation && (
				<label className="flex cursor-pointer items-center gap-2 text-text">
					<input
						type="checkbox"
						className="size-4 accent-error"
						checked={isAcknowledged}
						onChange={(e) => onAcknowledgeChange(e.currentTarget.checked)}
					/>
					{isTransferRisk(risk)
						? "I accept these fees and want to transfer anyway"
						: "I accept this loss and want to swap anyway"}
				</label>
			)}
		</div>
	);
};
