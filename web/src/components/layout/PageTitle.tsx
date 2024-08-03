import type { FC, ReactNode } from "react";

export const PageTitle: FC<{ children: ReactNode }> = ({ children }) => (
	<h2 className="mb-2 text-lg font-bold text-primary-50 sm:px-4 sm:text-2xl">
		{children}
	</h2>
);
