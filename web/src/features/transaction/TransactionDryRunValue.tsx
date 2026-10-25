import { InformationCircleIcon } from "@heroicons/react/24/outline";
import type { FC } from "react";
import { Shimmer } from "../../components/Shimmer";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "../../components/tooltip/Tooltip";
import type { DryRun } from "../../hooks/useDryRun";
import { useDryRunError } from "../../hooks/useDryRunError";
import type { ChainId } from "../../registry/chains/types";
import { cn } from "../../utils/cn";
import { formatTxError } from "../../utils/getErrorMessageFromTxEvents";
import { useTransaction } from "./TransactionProvider";

export type SimulationVerdict = {
	label: "Success" | "Succeeds before fees" | "Failed";
	tone: "success" | "muted" | "warn";
	detail: string | null;
	note: string;
};

const DRY_RUN_CAVEAT =
	"Dry runs aren't always reliable as they are unaware of details that are only provided in signatures, such as which asset to use to pay for fees.";
const FEE_NOT_CHARGED =
	"The simulation runs the call without charging its fee, so it cannot tell whether the fee can be paid. The message under the amount tells whether the fee and the account minimum can be paid.";

export const getSimulationVerdict = ({
	dryRun,
	isDryRunConclusive,
	dryRunErrorMessage,
	insufficientBalances,
}: {
	dryRun: Extract<DryRun<ChainId>, { success: true }>;
	isDryRunConclusive: boolean;
	dryRunErrorMessage: string | null | undefined;
	insufficientBalances: Record<string, string>;
}): SimulationVerdict => {
	const { execution_result } = dryRun.value;
	if (execution_result.success)
		return isDryRunConclusive
			? {
					label: "Success",
					tone: "success",
					detail: null,
					note: DRY_RUN_CAVEAT,
				}
			: {
					label: "Succeeds before fees",
					tone: "muted",
					detail: null,
					note: FEE_NOT_CHARGED,
				};

	const [inputShortfall] = Object.values(insufficientBalances);
	return {
		label: "Failed",
		tone: "warn",
		detail:
			inputShortfall ??
			dryRunErrorMessage ??
			formatTxError(execution_result.value.error),
		note: DRY_RUN_CAVEAT,
	};
};

export const TransactionDryRunSummaryValue: FC<{ isBlocked?: boolean }> = ({
	isBlocked = false,
}) => {
	const {
		call,
		chainId,
		dryRun,
		errorDryRun,
		isLoadingDryRun,
		isDryRunConclusive,
		insufficientBalances,
	} = useTransaction();

	const { data: dryRunErrorMessage } = useDryRunError({ chainId, dryRun });

	if (!call)
		return (
			<span className="text-muted">
				{isBlocked ? "Not run" : "Nothing to simulate"}
			</span>
		);

	if (isLoadingDryRun) return <Shimmer className="h-4">Success</Shimmer>;

	if (errorDryRun || (dryRun && !dryRun.success))
		return <span className="text-muted">Unavailable</span>;

	if (!dryRun) return null;

	const verdict = getSimulationVerdict({
		dryRun,
		isDryRunConclusive,
		dryRunErrorMessage,
		insufficientBalances,
	});

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger render={<div />}>
				<div
					className={cn(
						"flex gap-1 items-center",
						verdict.tone === "warn" && "text-warn",
						verdict.tone === "muted" && "text-muted",
					)}
				>
					<span>{verdict.label}</span>
					<InformationCircleIcon className="size-5 inline align-text-bottom" />
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<div className="max-w-72">
					{verdict.detail && (
						<div className="mb-2 text-error">{verdict.detail}</div>
					)}
					<p>{verdict.note}</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
};
