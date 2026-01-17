import { cn } from "@kheopswap/utils";

export const Styles = {
	field: cn(
		"rounded-xs border border-neutral-800 bg-neutral-950/50 focus-within:border-primary",
	),

	button: cn(
		"rounded-sm border border-neutral-750 bg-neutral-850 enabled:hover:bg-neutral-800 disabled:opacity-70",
	),
};
