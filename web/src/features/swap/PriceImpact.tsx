import type { FC } from "react";
import { cn } from "../../utils/cn";
import { formatPercent } from "../../utils/formatPercent";

export const PriceImpact: FC<{ value: number; className?: string }> = ({
	value,
	className,
}) => {
	return (
		<span
			className={cn(
				value < -0.01 && "text-warn-500",
				value < -0.05 && "text-error-500",
				className,
			)}
		>
			{formatPercent(value)}
		</span>
	);
};
