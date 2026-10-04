import type { FC, ReactNode } from "react";

import { Fireflies } from "./Fireflies";
import { Footer } from "./Footer";
import { Header } from "./Header/Header";

export const Layout: FC<{ children?: ReactNode }> = ({ children }) => {
	return (
		<div className="flex min-h-dvh flex-col">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:text-text focus:ring-2 focus:ring-text"
			>
				Skip to main content
			</a>
			<Fireflies />
			<Header />
			<main
				id="main-content"
				tabIndex={-1}
				className="mx-auto w-full min-w-0 max-w-[1100px] grow px-3.5 pt-5 pb-10 outline-none sm:px-6 sm:pt-8 sm:pb-12"
			>
				<div className="animate-fade-in">{children}</div>
			</main>
			<Footer />
		</div>
	);
};
