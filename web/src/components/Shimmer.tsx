import type { FC, ReactNode } from "react";

import { cn } from "@kheopswap/utils";
import { Pulse } from "./Pulse";

export const Shimmer: FC<{ children?: ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<Pulse
			pulse
			className={cn(
				"select-none rounded",
				className,
				"bg-neutral-800 text-neutral-800",
			)}
		>
			{children}
		</Pulse>
	);
};
