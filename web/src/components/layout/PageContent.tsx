import type { FC, ReactNode } from "react";

export const PageContent: FC<{ children: ReactNode }> = ({ children }) => (
	<div className="rounded-lg sm:bg-primary-850/50 sm:p-4">{children}</div>
);
