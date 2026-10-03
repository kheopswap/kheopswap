import { Dialog } from "@base-ui/react/dialog";
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
				"flex h-full w-[min(420px,100vw)] flex-col border-l border-line bg-drawer",
				className,
			)}
		>
			<div
				className={cn(
					"flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line pr-3 pl-5",
					headerClassName,
				)}
			>
				<Dialog.Title className="text-[17px] font-semibold">
					{title}
				</Dialog.Title>
				{onClose && (
					<Dialog.Close
						aria-label="Close"
						className="grid size-9 place-items-center rounded-chip text-muted hover:bg-hover hover:text-text"
					>
						<CloseIcon className="size-4.5 fill-current" />
					</Dialog.Close>
				)}
			</div>
			<div
				className={cn(
					"flex grow flex-col gap-5 overflow-y-auto overflow-x-hidden px-5 pt-4 pb-6",
					contentClassName,
				)}
			>
				{children}
			</div>
		</div>
	);
};
