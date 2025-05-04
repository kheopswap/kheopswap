import type { FC, PropsWithChildren, ReactNode } from "react";

import { InformationCircleIcon } from "@heroicons/react/24/outline";
import { cn } from "@kheopswap/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

export const FormSummary: FC<PropsWithChildren & { className?: string }> = ({
	children,
	className,
}) => <div className={cn("flex flex-col gap-2", className)}>{children}</div>;

export const FormSummarySection: FC<
	PropsWithChildren & { className?: string }
> = ({ children, className }) => <div className={className}>{children}</div>;

export const FormSummaryRow: FC<{
	label: ReactNode;
	value: ReactNode;
	className?: string;
}> = ({ label, value, className }) => (
	<div
		className={cn("flex w-full items-center gap-2 overflow-hidden", className)}
	>
		<div className="grow truncate text-neutral-500">{label}</div>
		<div className="shrink-0 text-right">{value}</div>
	</div>
);

export const FormSummaryError: FC<
	PropsWithChildren<{ label: string; className?: string }>
> = ({ label, className, children }) => (
	<Tooltip placement="bottom-end">
		<TooltipTrigger asChild>
			<div className={cn("flex gap-1 items-center text-warn", className)}>
				<span>{label}</span>
				<InformationCircleIcon className="size-5 inline align-text-bottom" />
			</div>
		</TooltipTrigger>
		{!!children && (
			<TooltipContent>
				<div className="max-w-72">{children}</div>
			</TooltipContent>
		)}
	</Tooltip>
);
