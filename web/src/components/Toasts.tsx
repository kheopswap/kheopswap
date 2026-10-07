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
				<div className="bg-hover rounded-full size-6 shrink-0 flex items-center justify-center">
					<InformationCircleIcon className="size-5 text-text" />
				</div>
			);
		case "warning":
			return (
				<div className="bg-warn/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<ExclamationTriangleIcon className="size-4 text-warn" />
				</div>
			);
		case "success":
			return (
				<div className="bg-success/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<CheckIcon className="size-4 text-success" />
				</div>
			);
		case "error":
			return (
				<div className="bg-error/20 rounded-full size-6 shrink-0 flex items-center justify-center">
					<XMarkIcon className="size-4 text-error" />
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
		toastClassName="rounded-control border border-line font-sans text-sm"
		position="bottom-right"
		icon={icon}
	/>
);
