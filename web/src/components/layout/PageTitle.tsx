import type { FC, ReactNode } from "react";

export const PageTitle: FC<{ children: ReactNode }> = ({ children }) => (
	<h2 className="mx-auto mb-3.5 max-w-[480px] px-1 text-sm font-semibold text-text">
		{children}
	</h2>
);
