import {
	Dialog,
	DialogPanel,
	DialogTitle,
	Transition,
	TransitionChild,
} from "@headlessui/react";
import { cn } from "@kheopswap/utils";
import { type FC, Fragment, type ReactNode, useCallback } from "react";

type ModalDialog = {
	isOpen: boolean;
	title: ReactNode;
	children: ReactNode;
	onClose?: () => void;
};

export const ModalDialog: FC<ModalDialog> = ({
	isOpen,
	title,
	children,
	onClose,
}) => {
	const handleClose = useCallback(() => {
		onClose?.();
	}, [onClose]);

	return (
		<Transition appear show={isOpen} as={Fragment}>
			<Dialog open onClose={handleClose}>
				<TransitionChild
					as={Fragment}
					enter="ease-out duration-300"
					enterFrom="opacity-0"
					enterTo="opacity-100"
					leave="ease-in duration-200"
					leaveFrom="opacity-100"
					leaveTo="opacity-0"
				>
					<div className="fixed inset-0 z-20 bg-black/50" />
				</TransitionChild>

				<div className="fixed inset-0 z-30 overflow-y-auto">
					<div className="flex min-h-full items-center justify-center p-4 text-center">
						<TransitionChild
							as={Fragment}
							enter="ease-out duration-300"
							enterFrom="opacity-0 scale-95"
							enterTo="opacity-100 scale-100"
							leave="ease-in duration-200"
							leaveFrom="opacity-100 scale-100"
							leaveTo="opacity-0 scale-95"
						>
							<DialogPanel
								className={cn(
									"w-full max-w-sm space-y-4 overflow-hidden rounded-md border border-primary-700 bg-primary-850 p-3  text-left align-middle shadow-xl transition-all",
								)}
							>
								<DialogTitle as="h3" className="text-xl font-bold">
									{title}
								</DialogTitle>
								<div className="text-sm ">{children}</div>
							</DialogPanel>
						</TransitionChild>
					</div>
				</div>
			</Dialog>
		</Transition>
	);
};
