import { Transition, TransitionChild } from "@headlessui/react";
import { FC, Fragment, ReactNode } from "react";
import { useScrollLock } from "usehooks-ts";

import { cn } from "src/util";

type Modal = {
	isOpen: boolean;
	children: ReactNode;
	onDismiss?: () => void;
};

const ScrollLock = () => {
	useScrollLock({ autoLock: true });
	return null;
};

export const Modal: FC<Modal> = ({ isOpen, children, onDismiss }) => {
	return (
		<Transition appear show={isOpen} as={Fragment}>
			<TransitionChild
				as="div"
				className={cn("fixed inset-0 z-20 bg-black/80")}
				enter="ease-out duration-300"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="ease-in duration-200"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
			/>

			<div
				onClick={onDismiss}
				role="presentation"
				className={cn(
					"fixed inset-0 z-30",
					"flex min-h-full items-center justify-center p-4 text-center",
					onDismiss && "cursor-pointer",
				)}
			>
				<div
					className="cursor-default"
					onClick={(e) => {
						e.stopPropagation();
					}}
					role="presentation"
				>
					<TransitionChild
						as="div"
						enter="ease-out duration-300"
						enterFrom="opacity-0 scale-95"
						enterTo="opacity-100 scale-100"
						leave="ease-in duration-200"
						leaveFrom="opacity-100 scale-100"
						leaveTo="opacity-0 scale-95"
					>
						<ScrollLock />
						{children}
					</TransitionChild>
				</div>
			</div>
		</Transition>
	);
};
