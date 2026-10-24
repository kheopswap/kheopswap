import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { cn } from "../../utils/cn";
import { formatPercent } from "../../utils/formatPercent";
import { TokenAmountValue } from "./routes/AmmPathValues";
import { useSwap } from "./SwapProvider";
import { isTransferRisk, type LossCause, type SwapLoss } from "./swapRisk";

const LossCauseText: FC<{ cause: LossCause | null }> = ({ cause }) => {
	const { details } = useSwap();
	const deliveryFee =
		details.kind === "amm-swap" ? undefined : details.quote.deliveryFee;
	switch (cause) {
		case "delivery-fee":
			return deliveryFee ? (
				<>
					, mostly the <TokenAmountValue {...deliveryFee} /> delivery fee
				</>
			) : null;
		case "price-impact":
			return ", mostly from price impact";
		case null:
			return null;
	}
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
			return (
				<>
					Fees take {formatPercent(ratio)} of what you send
					<LossCauseText cause={cause} />.
				</>
			);
	}
};

export const SwapRiskWarning = () => {
	const { risk, isRiskAcknowledged, onRiskAcknowledgeChange } = useSwap();
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
						checked={isRiskAcknowledged}
						onChange={(e) => onRiskAcknowledgeChange(e.currentTarget.checked)}
					/>
					{isTransferRisk(risk)
						? "I accept these fees and want to transfer anyway"
						: "I accept this loss and want to swap anyway"}
				</label>
			)}
		</div>
	);
};
