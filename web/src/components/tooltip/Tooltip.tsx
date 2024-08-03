/* eslint-disable react/prop-types */
import { FloatingPortal, useMergeRefs } from "@floating-ui/react";
import * as React from "react";

import {
	TooltipContext,
	type TooltipOptions,
	useTooltip,
	useTooltipContext,
} from "./useTooltip";

import { cn } from "src/util";

export function Tooltip({
	children,
	...options
}: { children: React.ReactNode } & TooltipOptions) {
	// This can accept any props as options, e.g. `placement`,
	// or other positioning options.
	const tooltip = useTooltip(options);
	return (
		<TooltipContext.Provider value={tooltip}>
			{children}
		</TooltipContext.Provider>
	);
}

export const TooltipTrigger = React.forwardRef<
	HTMLElement,
	React.HTMLProps<HTMLElement> & { asChild?: boolean }
>(function TooltipTrigger({ children, asChild = false, ...props }, propRef) {
	const context = useTooltipContext();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const childrenRef = (children as any).ref;
	const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

	// `asChild` allows the user to pass any element as the anchor
	if (asChild && React.isValidElement(children)) {
		return React.cloneElement(
			children,
			context.getReferenceProps({
				ref,
				...props,
				...children.props,
				"data-state": context.open ? "open" : "closed",
			}),
		);
	}

	return (
		<button
			ref={ref}
			// The user can style the trigger based on the state
			data-state={context.open ? "open" : "closed"}
			{...context.getReferenceProps(props)}
		>
			{children}
		</button>
	);
});

export const TooltipContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLProps<HTMLDivElement>
>(function TooltipContent({ ...props }, propRef) {
	const context = useTooltipContext();
	const ref = useMergeRefs([context.refs.setFloating, propRef]);

	return (
		<FloatingPortal>
			{context.open && (
				<div
					ref={ref}
					className={cn(
						"z-50 rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-300 shadow",
						props.className,
					)}
					style={{
						position: context.strategy,
						top: context.y ?? 0,
						left: context.x ?? 0,
						visibility: context.x == null ? "hidden" : "visible",
						...props.style,
					}}
					{...context.getFloatingProps(props)}
				/>
			)}
		</FloatingPortal>
	);
});
