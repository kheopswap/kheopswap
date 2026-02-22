import type { FC, ReactNode } from "react";
import { cn } from "../utils/cn";

export const ColumnHeaderButton: FC<{
	selected: boolean;
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}> = ({ selected, children, className, onClick }) => {
	return (
		<button
			type="button"
			aria-pressed={selected}
			className={cn(
				"text-xs text-neutral-500",
				className,
				onClick ? "cursor-pointer" : "cursor-default",
				selected && "text-neutral-200",
			)}
			onClick={onClick}
		>
			{children}
		</button>
	);
};
