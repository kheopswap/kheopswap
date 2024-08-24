import type { FC, ReactNode } from "react";

import { cn } from "src/util";
import { Pulse } from "./Pulse";

export const Shimmer: FC<{ children?: ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<Pulse
			pulse
			className={cn(
				"select-none rounded bg-neutral-800 text-neutral-800",
				className,
			)}
		>
			{children}
		</Pulse>
	);
};
