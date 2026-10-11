import { cn } from "../utils/cn";

export const Styles = {
	label: cn(
		"font-display text-[10.5px] uppercase tracking-[0.16em] text-muted",
	),

	field: cn(
		"rounded-control border border-line bg-surface-2 focus-within:border-faint",
	),

	button: cn(
		"rounded-control bg-surface-2 enabled:hover:bg-hover disabled:opacity-70",
	),

	headerButton: cn(
		"flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-grid/20 bg-control px-2.5 text-[13px] font-medium hover:bg-hover sm:gap-2 sm:px-3 sm:text-sm",
	),

	primaryButton: cn(
		"flex h-12 w-full items-center justify-center rounded-control bg-primary text-base font-bold uppercase tracking-[0.16em] text-primary-ink shadow-submit transition-[filter] enabled:hover:brightness-108 disabled:bg-hover disabled:text-muted disabled:shadow-none",
	),
};
