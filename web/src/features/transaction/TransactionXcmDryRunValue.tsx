import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@kheopswap/utils";
import { useMemo } from "react";
import {
	Shimmer,
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "src/components";
import { useTransaction } from "./TransactionProvider";

export const TransactionXcmDryRunSummaryValue = () => {
	const { xcmDryRun, errorXcmDryRun, isLoadingXcmDryRun, call } =
		useTransaction();

	const [success, error] = useMemo(() => {
		if (!xcmDryRun?.success) return [false, null];
		switch (xcmDryRun.value.execution_result.type) {
			case "Complete":
				return [true, null];
			default:
				return [false, xcmDryRun.value.execution_result.value.error.type];
		}
	}, [xcmDryRun]);

	if (!call) return null;

	if (isLoadingXcmDryRun) return <Shimmer className="h-4">Success</Shimmer>;

	if (errorXcmDryRun || !xcmDryRun?.success)
		return <span className="text-neutral-500">Unavailable</span>;

	return (
		<Tooltip placement="bottom-end">
			<TooltipTrigger asChild>
				<div className={cn("flex gap-1 items-center", !success && "text-warn")}>
					{success ? (
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
					{error && <div className="mb-2 text-error">{error}</div>}
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
