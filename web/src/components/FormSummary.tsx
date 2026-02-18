import type { FC, PropsWithChildren, ReactNode } from "react";
import { cn } from "../utils/cn";

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
