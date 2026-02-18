import { Dialog } from "@base-ui-components/react/dialog";
import { type FC, type ReactNode, useCallback } from "react";
import { cn } from "../utils/cn";

type Modal = {
	isOpen: boolean;
	children: ReactNode;
	onDismiss?: () => void;
};

export const Modal: FC<Modal> = ({ isOpen, children, onDismiss }) => {
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) onDismiss?.();
		},
		[onDismiss],
	);

	return (
		<Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop
					className={cn(
						"fixed inset-0 z-20 bg-black/80",
						"transition-opacity duration-300 ease-out",
						"data-open:opacity-100",
						"data-starting-style:opacity-0",
						"data-closed:opacity-0",
						onDismiss && "cursor-pointer",
					)}
				/>
				<Dialog.Popup
					className={cn(
						"fixed inset-0 z-30 outline-hidden",
						"flex min-h-full items-center justify-center p-4 text-center",
						"transition-[opacity,transform] duration-300 ease-out",
						"data-open:scale-100 data-open:opacity-100",
						"data-starting-style:scale-95 data-starting-style:opacity-0",
						"data-closed:scale-95 data-closed:opacity-0",
					)}
				>
					{children}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
};
