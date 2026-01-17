import {
	CheckIcon,
	ExclamationTriangleIcon,
	InformationCircleIcon,
	XMarkIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";
import { type IconProps, ToastContainer } from "react-toastify";
import { SpinnerBasicIcon } from "./icons";

const icon = (props: IconProps): ReactNode => {
	switch (props.type) {
		case "info":
			return (
				//<InformationCircleIcon className="size-6 stroke-neutral-50 shrink-0" />
				<div className="bg-cyan/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<InformationCircleIcon className="size-5 stroke-cyan-500  " />
				</div>
			);
		case "warning":
			return (
				<div className="bg-warn/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<ExclamationTriangleIcon className="size-4 stroke-warn-500  " />
				</div>
			);
		case "success":
			return (
				<div className="bg-success/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<CheckIcon className="size-4 stroke-success-500  " />
				</div>
			);
		case "error":
			return (
				<div className="bg-error/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<XMarkIcon className="size-4 stroke-error-500  " />
				</div>
			);
		case "default":
			return props.isLoading ? (
				<SpinnerBasicIcon className="size-6 shrink-0 flex items-center justify-center" />
			) : null;
	}
};

export const Toasts = () => (
	<ToastContainer
		theme="dark"
		bodyClassName={"font-sans text-sm gap-1 "}
		toastClassName={"bg-neutral-850 border-neutral-800 border"}
		position="bottom-right"
		icon={icon}
	/>
);
