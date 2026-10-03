import { cn } from "../utils/cn";

export const Styles = {
	label: cn("text-[13px] font-medium text-muted"),

	field: cn(
		"rounded-control border border-transparent bg-surface-2 focus-within:border-faint",
	),

	button: cn(
		"rounded-control bg-surface-2 enabled:hover:bg-hover disabled:opacity-70",
	),

	headerButton: cn(
		"flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-control border border-surface-border bg-surface px-2.5 text-[13px] font-medium hover:bg-hover sm:gap-2 sm:px-3 sm:text-sm",
	),

	primaryButton: cn(
		"flex h-12 w-full items-center justify-center rounded-control bg-primary text-base font-semibold text-primary-ink transition-[filter] enabled:hover:brightness-108 disabled:bg-hover disabled:text-muted",
	),
};
