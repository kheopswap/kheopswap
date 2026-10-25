import type { FC } from "react";
import { cn } from "../../utils/cn";
import { formatFixedPercent } from "../../utils/formatPercent";

const SMALLEST_SHOWN_IMPACT = -0.0001;

const formatPriceImpact = (value: number) =>
	value < 0 && value > SMALLEST_SHOWN_IMPACT
		? "< 0.01%"
		: formatFixedPercent(value);

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
			{formatPriceImpact(value)}
		</span>
	);
};
