import type { FC, ReactNode } from "react";
import { NavLink, useParams } from "react-router";
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
				"relative flex h-11 shrink-0 items-center whitespace-nowrap px-3 font-medium text-muted hover:text-text sm:h-16 sm:px-3.5",
				isActive &&
					"text-accent after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-accent hover:text-accent sm:after:inset-x-3.5 sm:after:-bottom-px",
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
			className="order-last -mx-3.5 flex w-[calc(100%+1.75rem)] overflow-x-auto [scrollbar-width:none] sm:order-none sm:mx-0 sm:w-auto sm:overflow-visible"
		>
			<NavItem to={`/${relayId}/swap`}>Swap</NavItem>
			<NavItem to={`/${relayId}/transfer`}>Transfer</NavItem>
			<NavItem to={`/${relayId}/portfolio`}>
				{accounts.length ? "Portfolio" : "Tokens"}
			</NavItem>
			<NavItem to={`/${relayId}/pools`}>
				<span className="hidden min-[440px]:inline">Liquidity&nbsp;</span>Pools
			</NavItem>
		</nav>
	);
};

export const Header: FC = () => (
	<header className="sticky top-0 z-10 border-b border-line bg-page">
		<div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-2 gap-y-2.5 sm:gap-x-7 px-3.5 pt-2.5 sm:h-16 sm:flex-nowrap sm:px-6 sm:pt-0">
			<div className="flex items-center gap-2 text-base font-bold text-text sm:gap-2.5 sm:text-xl">
				<img src="/android-chrome-192x192.png" alt="" className="size-7" />
				Kheopswap
			</div>
			<MainNav />
			<div className="ml-auto flex items-center gap-1.5 sm:gap-2">
				<ColorModeToggle />
				<RelaySelect />
				<ConnectButton />
			</div>
		</div>
	</header>
);
