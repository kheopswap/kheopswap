import type { FC, PropsWithChildren, ReactNode } from "react";
import { cn } from "../utils/cn";

export const FormSummary: FC<PropsWithChildren & { className?: string }> = ({
	children,
	className,
}) => <div className={cn("flex flex-col px-0.5", className)}>{children}</div>;

export const FormSummarySection: FC<
	PropsWithChildren & { className?: string }
> = ({ children, className }) => <div className={className}>{children}</div>;

export const FormSummaryRow: FC<{
	label: ReactNode;
	value: ReactNode;
	className?: string;
}> = ({ label, value, className }) => (
	<div
		className={cn(
			"flex w-full items-center gap-4 overflow-hidden py-1.25",
			className,
		)}
	>
		<div className="grow truncate text-muted">{label}</div>
		<div className="shrink-0 text-right">{value}</div>
	</div>
);
