import type { FC, ReactNode } from "react";
import { cn } from "../../utils/cn";

type PageContentVariant = "form" | "table";

const variantClassName: Record<PageContentVariant, string> = {
	form: "mx-auto max-w-[480px] p-4 sm:p-5",
	table: "px-4 pt-4 pb-1.5 sm:px-5 sm:pt-4.5",
};

export const PageContent: FC<{
	variant?: PageContentVariant;
	children: ReactNode;
}> = ({ variant = "form", children }) => (
	<div
		className={cn(
			"rounded-card border border-surface-border bg-surface",
			variantClassName[variant],
		)}
	>
		{children}
	</div>
);
