import type { FC, ReactNode } from "react";

import { cn } from "src/util";

export const Shimmer: FC<{ children?: ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<div
			className={cn(
				"animate-pulse select-none rounded bg-neutral-800 text-neutral-800",
				className,
			)}
		>
			{children}
		</div>
	);
};
