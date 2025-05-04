import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn, formatTxError } from "@kheopswap/utils";
import { useMemo } from "react";
import {
	Shimmer,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components";
import { useDryRunError } from "src/hooks";
import { useTransaction } from "./TransactionProvider";

export const TransactionDryRunSummaryValue = () => {
	const { chainId, dryRun, errorDryRun, isLoadingDryRun, call } =
		useTransaction();

	const { data: errorMessage } = useDryRunError({ chainId, dryRun });

	const formattedError = useMemo(() => {
		if (errorMessage) return errorMessage;

		if (!dryRun?.success || dryRun.value.execution_result.success) return null;

		return formatTxError(dryRun.value.execution_result.value.error);
	}, [dryRun, errorMessage]);

	if (!call) return null;

	if (isLoadingDryRun) return <Shimmer className="h-4">Success</Shimmer>;

	if (errorDryRun || !dryRun?.success)
		return <span className="text-neutral-500">Unavailable</span>;

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger asChild>
				<div
					className={cn(
						"flex gap-1 items-center",
						!dryRun.value.execution_result.success && "text-warn",
					)}
				>
					{dryRun.value.execution_result.success ? (
						<>
							<span>Success</span>
							<InformationCircleIcon className="size-5 inline align-text-bottom" />
						</>
					) : (
						<>
							<span>Failed</span>
							<InformationCircleIcon className="size-5 inline align-text-bottom" />
						</>
					)}
				</div>
			</TooltipTrigger>
			<TooltipContent>
				<div className="max-w-72">
					{formattedError && (
						<div className="mb-2 text-error">{formattedError}</div>
					)}
					<p>
						Dry runs aren't always reliable as they are unaware of details that
						are only provided in signatures, such as which asset to use to pay
						for fees.
					</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
};
