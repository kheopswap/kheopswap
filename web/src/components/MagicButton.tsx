import type React from "react";
import { type FC, useMemo, useState } from "react";
import { cn } from "../utils/cn";

export const MagicButton: FC<
	React.DetailedHTMLProps<
		React.ButtonHTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> & { disabled?: boolean; className?: string }
> = ({ children, className, disabled, ...props }) => {
	const [hovered, setHovered] = useState<boolean>(false);

	const [shouldRotateBorder, shouldHighlight] = useMemo(
		() => [!hovered && !disabled, hovered && !disabled],
		[disabled, hovered],
	);

	return (
		<button
			onMouseEnter={() => {
				setHovered(true);
			}}
			onMouseLeave={() => setHovered(false)}
			className={cn(
				"relative flex items-center justify-center transition-colors duration-500",
				"group rounded-sm enabled:bg-primary disabled:bg-neutral-800 disabled:opacity-50",
				"my-2 h-14 text-xl font-bold",
				className,
			)}
			disabled={disabled}
			{...props}
		>
			{!disabled && (
				<div
					className={cn(
						"magic-glow absolute z-0 size-full rounded-[inherit] blur-xs motion-reduce:hidden",
						shouldRotateBorder && "magic-glow--rotate",
						shouldHighlight && "magic-glow--highlight",
					)}
				/>
			)}
			<div className="absolute z-10 size-full overflow-hidden rounded-[inherit] p-px ">
				<div
					className={cn(
						"size-full rounded-[inherit]",
						"bg-primary-950 transition-colors duration-300 group-hover:group-enabled:bg-primary-900 group-disabled:bg-primary-950",
					)}
				/>
			</div>
			<div className={cn("z-20")}>{children}</div>
		</button>
	);
};
