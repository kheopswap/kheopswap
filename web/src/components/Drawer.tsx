import { Dialog } from "@base-ui-components/react/dialog";
import { cn } from "@kheopswap/utils";
import { type FC, type ReactNode, useCallback } from "react";

type DrawerAnchor = "top" | "right" | "bottom" | "left";

type DrawerProps = {
	anchor: DrawerAnchor;
	children: ReactNode;
	isOpen?: boolean;
	className?: string;
	onDismiss?: () => void;
};

const anchorPositionClass: Record<DrawerAnchor, string> = {
	right: "right-0 top-0 h-dvh",
	left: "left-0 top-0 h-dvh",
	top: "left-0 top-0 w-screen",
	bottom: "left-0 bottom-0 w-screen",
};

const anchorAnimationClass: Record<DrawerAnchor, string> = {
	right:
		"data-open:translate-x-0 data-starting-style:translate-x-full data-closed:translate-x-full",
	left: "data-open:translate-x-0 data-starting-style:-translate-x-full data-closed:-translate-x-full",
	top: "data-open:translate-y-0 data-starting-style:-translate-y-full data-closed:-translate-y-full",
	bottom:
		"data-open:translate-y-0 data-starting-style:translate-y-full data-closed:translate-y-full",
};

export const Drawer: FC<DrawerProps> = ({
	anchor,
	children,
	isOpen,
	className,
	onDismiss,
}) => {
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) onDismiss?.();
		},
		[onDismiss],
	);

	return (
		<Dialog.Root open={!!isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop
					className={cn(
						"fixed inset-0 z-30 bg-black/50",
						"transition-opacity duration-300 ease-linear",
						"data-open:opacity-100",
						"data-starting-style:opacity-0",
						"data-closed:opacity-0",
						!onDismiss && "cursor-not-allowed",
					)}
				/>
				<Dialog.Popup
					className={cn(
						"fixed z-40 shadow-2xl outline-hidden",
						"transition-transform duration-300 ease-in-out",
						anchorPositionClass[anchor],
						anchorAnimationClass[anchor],
						className,
					)}
				>
					{children}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
