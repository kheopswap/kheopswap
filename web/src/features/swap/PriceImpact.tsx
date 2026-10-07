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
				"font-mono",
				value < -0.01 && "text-warn",
				value < -0.05 && "text-error",
				className,
			)}
		>
			{formatPercent(value)}
		</span>
	);
};
