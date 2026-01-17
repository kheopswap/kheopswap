import { cn } from "@kheopswap/utils";
import { type FC, type ReactNode, useCallback, useMemo } from "react";

const RatioButton: FC<{
	children: ReactNode;
	selected: boolean;
	disabled?: boolean;
	onClick: () => void;
}> = ({ children, selected, disabled, onClick }) => (
	<button
		type="button"
		className={cn(
			"h-8 rounded-sm px-2",
			selected
				? "bg-primary-500"
				: "bg-primary-700 enabled:hover:bg-primary-650",
		)}
		onClick={onClick}
		disabled={disabled}
	>
		{children}
	</button>
);

export const RemoveLiquiditySlider: FC<{
	ratio: number;
	disabled?: boolean;
	onRatioChange: (ratio: number) => void;
}> = ({ ratio, disabled, onRatioChange }) => {
	const step = useMemo(() => Math.round(ratio * 100), [ratio]);

	const handleChange = useCallback(
		(val: number) => () => {
			onRatioChange(val);
		},
		[onRatioChange],
	);

	return (
		<div
			className={cn(
				"flex w-full flex-col gap-5 rounded-sm border border-neutral-500 bg-neutral-900 p-3 py-4",
				disabled && "opacity-50",
			)}
		>
			<div className="flex w-full flex-wrap gap-2">
				<div className="grow text-2xl text-white">{step}%</div>
				<div className="flex gap-2 text-sm">
					<RatioButton
						selected={ratio === 0.25}
						onClick={handleChange(0.25)}
						disabled={disabled}
					>
						25%
					</RatioButton>
					<RatioButton
						selected={ratio === 0.5}
						onClick={handleChange(0.5)}
						disabled={disabled}
					>
						50%
					</RatioButton>
					<RatioButton
						selected={ratio === 0.75}
						onClick={handleChange(0.75)}
						disabled={disabled}
					>
						75%
					</RatioButton>
					<RatioButton
						selected={ratio === 1}
						onClick={handleChange(1)}
						disabled={disabled}
					>
						MAX
					</RatioButton>
				</div>
			</div>
			<input
				type="range"
				min={1}
				max={100}
				value={step}
				onChange={(e) => onRatioChange(e.target.valueAsNumber / 100)}
				className={cn("w-full", !disabled && "cursor-pointer")}
				disabled={disabled}
			/>
		</div>
	);
};
