import { Tooltip as BaseTooltip } from "@base-ui-components/react/tooltip";
import { cn } from "@kheopswap/utils";
import {
	createContext,
	type FC,
	type ReactElement,
	type ReactNode,
	useContext,
} from "react";

type Side = "top" | "right" | "bottom" | "left";
type Align = "start" | "center" | "end";

type TooltipPlacement = Side | `${Side}-start` | `${Side}-end`;

const PlacementContext = createContext<{
	side: Side;
	align: Align;
}>({ side: "bottom", align: "center" });

export const Tooltip: FC<{
	children: ReactNode;
	placement?: TooltipPlacement;
}> = ({ children, placement }) => {
	const side = (placement?.split("-")[0] as Side | undefined) ?? "bottom";
	const align = placement?.includes("-")
		? (placement.split("-")[1] as "start" | "end")
		: "center";

	return (
		<PlacementContext.Provider value={{ side, align }}>
			<BaseTooltip.Provider delay={250}>
				<BaseTooltip.Root>{children}</BaseTooltip.Root>
			</BaseTooltip.Provider>
		</PlacementContext.Provider>
	);
};

export const TooltipTrigger: FC<{
	children: ReactNode;
	render?: ReactElement<Record<string, unknown>>;
	className?: string;
	onClick?: React.MouseEventHandler;
}> = ({ children, render, className, onClick }) => (
	<BaseTooltip.Trigger render={render} className={className} onClick={onClick}>
		{children}
	</BaseTooltip.Trigger>
);

export const TooltipContent: FC<{
	children: ReactNode;
	className?: string;
}> = ({ children, className }) => {
	const { side, align } = useContext(PlacementContext);

	return (
		<BaseTooltip.Portal>
			<BaseTooltip.Positioner side={side} sideOffset={5} align={align}>
				<BaseTooltip.Popup
					className={cn(
						"z-50 rounded-sm border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-300 shadow-sm",
						className,
					)}
				>
					{children}
				</BaseTooltip.Popup>
			</BaseTooltip.Positioner>
		</BaseTooltip.Portal>
	);
};
