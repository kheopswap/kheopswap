import { Dialog } from "@base-ui-components/react/dialog";
import CloseIcon from "@w3f/polkadot-icons/solid/Close";
import type { FC, ReactNode } from "react";
import { cn } from "../utils/cn";

export const DrawerContainer: FC<{
	title: ReactNode;
	className?: string;
	headerClassName?: string;
	contentClassName?: string;
	children: ReactNode;
	onClose?: () => void;
}> = ({
	title,
	className,
	headerClassName,
	contentClassName,
	children,
	onClose,
}) => {
	return (
		<div
			className={cn(
				"flex h-full w-96 max-w-full flex-col bg-neutral-900",
				className,
			)}
		>
			<div
				className={cn(
					"flex h-10 shrink-0 items-center justify-between bg-black px-3 font-bold",
					headerClassName,
				)}
			>
				<Dialog.Title className="text-base font-bold">{title}</Dialog.Title>
				{onClose && (
					<Dialog.Close
						aria-label="Close"
						className="rounded-xs outline-white ring-white focus:outline-hidden focus-visible:ring-1"
					>
						<CloseIcon className="size-5 fill-white" />
					</Dialog.Close>
				)}
			</div>
			<div
				className={cn(
					"flex grow flex-col gap-4 overflow-y-auto overflow-x-hidden p-3",
					contentClassName,
				)}
			>
				{children}
			</div>
		</div>
	);
};
