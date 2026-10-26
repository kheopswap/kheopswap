import type { FC, PropsWithChildren } from "react";
import { cn } from "../utils/cn";

export const FollowUpRow: FC<
	PropsWithChildren & { label: string; className?: string }
> = ({ label, className, children }) => (
	<div className="flex flex-wrap justify-between">
		<div className="text-muted">{label}</div>
		<div className={cn("text-right font-medium", className)}>{children}</div>
	</div>
);
