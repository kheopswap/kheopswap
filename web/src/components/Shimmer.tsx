import type { FC, ReactNode } from "react";
import { cn } from "../utils/cn";
import { Pulse } from "./Pulse";

export const Shimmer: FC<{ children?: ReactNode; className?: string }> = ({
	children,
	className,
}) => {
	return (
		<Pulse
			pulse
			aria-hidden="true"
			className={cn(
				"select-none rounded-sm",
				className,
				"bg-hover text-transparent",
			)}
		>
			{children}
		</Pulse>
	);
};
