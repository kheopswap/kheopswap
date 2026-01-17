import { Transition, TransitionChild } from "@headlessui/react";
import { cn } from "@kheopswap/utils";
import { type FC, Fragment, type ReactNode } from "react";
import { useScrollLock } from "usehooks-ts";

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

			{/** biome-ignore lint/a11y/noStaticElementInteractions: legacy */}
			<div
				role="presentation"
				onClick={onDismiss}
				className={cn(
					"fixed inset-0 z-30",
					"flex min-h-full items-center justify-center p-4 text-center",
					onDismiss && "cursor-pointer",
				)}
			>
				{/** biome-ignore lint/a11y/noStaticElementInteractions: legacy */}
				<div
					role="presentation"
					className="cursor-default"
					onClick={(e) => {
						e.stopPropagation();
					}}
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
