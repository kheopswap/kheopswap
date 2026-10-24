import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { cn } from "../../utils/cn";
import { formatPercent } from "../../utils/formatPercent";
import { useSwap } from "./SwapProvider";
import type { SwapLoss } from "./swapRisk";

const describeLoss = ({ kind, ratio }: SwapLoss) => {
	switch (kind) {
		case "price-impact":
			return `Price impact is ${formatPercent(ratio)}: this trade moves the pool price against you.`;
		case "value-loss":
			return `You receive ${formatPercent(ratio)} less value than you send.`;
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
				<div className="flex flex-col gap-1">
					{risk.losses.map((loss) => (
						<p key={loss.kind}>{describeLoss(loss)}</p>
					))}
				</div>
			</div>
			{needsConfirmation && (
				<label className="flex cursor-pointer items-center gap-2 text-text">
					<input
						type="checkbox"
						className="size-4 accent-error"
						checked={isRiskAcknowledged}
						onChange={(e) => onRiskAcknowledgeChange(e.currentTarget.checked)}
					/>
					I accept this loss and want to swap anyway
				</label>
			)}
		</div>
	);
};
