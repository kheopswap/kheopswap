import type { FC, ReactNode } from "react";

import { Footer } from "./Footer";
import { Header } from "./Header/Header";
import { HorizontalNav } from "./HorizontalNav";

export const Layout: FC<{ children?: ReactNode }> = ({ children }) => {
	return (
		<div className="flex min-h-dvh flex-col">
			<a
				href="#main-content"
				className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-12 focus:z-50 focus:rounded-md focus:bg-neutral-900 focus:px-4 focus:py-2 focus:text-white focus:ring-2 focus:ring-pink"
			>
				Skip to main content
			</a>
			<Header />
			<main
				id="main-content"
				tabIndex={-1}
				className="flex min-h-screen w-full grow outline-none sm:min-h-min"
			>
				<div className="grow py-2 pb-4">
					<div className="container mx-auto max-w-2xl">
						<HorizontalNav />
						<div className="max-w-dvw animate-fade-in">{children}</div>
					</div>
				</div>
			</main>
			<Footer />
		</div>
	);
};
