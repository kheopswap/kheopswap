import type { FC, ReactNode } from "react";
import { NavLink, useParams } from "react-router";
import logoSvg from "../../../../public/logo.svg?raw";
import { useWallets } from "../../../common/kheopskit";
import { cn } from "../../../utils/cn";
import { ConnectButton } from "../../ConnectButton";
import { ColorModeToggle } from "./ColorModeToggle";
import { RelaySelect } from "./RelaySelect";

const NavItem: FC<{ to: string; children: ReactNode }> = ({ to, children }) => (
	<NavLink
		to={to}
		className={({ isActive }) =>
			cn(
				"relative flex h-11 shrink-0 items-center whitespace-nowrap px-2 font-display text-[10px] uppercase tracking-[0.1em] text-muted hover:text-text sm:h-16 sm:px-3.5 sm:text-[11px] sm:tracking-[0.14em]",
				isActive &&
					"text-accent text-shadow-nav after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:nav-trail hover:text-accent sm:after:inset-x-3.5 sm:after:-bottom-px",
			)
		}
	>
		{children}
	</NavLink>
);

const MainNav: FC = () => {
	const { accounts } = useWallets();
	const { relayId } = useParams();

	return (
		<nav
			aria-label="Main navigation"
			className="order-last -mx-3 flex w-[calc(100%+1.5rem)] overflow-x-auto [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible"
		>
			<NavItem to={`/${relayId}/swap`}>Swap</NavItem>
			<NavItem to={`/${relayId}/transfer`}>Transfer</NavItem>
			<NavItem to={`/${relayId}/portfolio`}>
				{accounts.length ? "Portfolio" : "Tokens"}
			</NavItem>
			<NavItem to={`/${relayId}/pools`}>Liquidity</NavItem>
		</nav>
	);
};

export const Header: FC<{ minimal?: boolean }> = ({ minimal }) => (
	<header className="sticky top-0 z-10 border-b border-line bg-chrome backdrop-blur-md">
		<div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-2 gap-y-2.5 px-3 pt-2.5 sm:gap-x-7 sm:h-16 sm:flex-nowrap sm:px-6 sm:pt-0">
			<div className="flex items-center gap-1.5 font-display text-[13px] uppercase tracking-[0.14em] text-text text-shadow-brand sm:gap-2.5">
				<span
					aria-hidden
					className="size-6 [--logo-accent:var(--color-primary)] *:size-full sm:size-7"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: our own static logo, inlined so its accent follows the colour mode
					dangerouslySetInnerHTML={{ __html: logoSvg }}
				/>
				Kheopswap
			</div>
			{!minimal && <MainNav />}
			<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
				<ColorModeToggle />
				{!minimal && <RelaySelect />}
				{!minimal && <ConnectButton />}
			</div>
		</div>
	</header>
);
