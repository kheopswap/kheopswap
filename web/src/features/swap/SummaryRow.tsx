import type { FC, ReactNode } from "react";

export const SummaryRow: FC<{ label: ReactNode; value: ReactNode }> = ({
	label,
	value,
}) => (
	<div className="flex w-full items-center gap-2 overflow-hidden">
		<div className="grow truncate text-neutral-500">{label}</div>
		<div className="shrink-0 text-right">{value}</div>
	</div>
);
