import numeral from "numeral";
import type { FC } from "react";

import { cn } from "src/util";

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
			{numeral(value * 100).format("0.[00]")}%
		</span>
	);
};
