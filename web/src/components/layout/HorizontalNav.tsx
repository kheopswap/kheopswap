import { cn } from "@kheopswap/utils";
import type { ComponentProps, FC } from "react";
import { NavLink, useParams } from "react-router";
import { useWallets } from "src/hooks";

const NavItem: FC<ComponentProps<typeof NavLink>> = ({ to, children }) => {
	return (
		<NavLink
			to={to}
			className={cn(
				"rounded-xl px-1 py-0.5 text-neutral-50 opacity-50 min-[370px]:px-2 min-[370px]:py-1 sm:px-3",
				"hover:opacity-100 [&.active]:bg-pink [&.active]:opacity-100",
			)}
		>
			{children}
		</NavLink>
	);
};

export const HorizontalNav: FC = () => {
	const { accounts } = useWallets();
	const { relayId } = useParams();
	return (
		<div>
			<div
				className={cn(
					"my-2 flex w-full justify-center px-2 text-sm min-[340px]:gap-1 min-[360px]:gap-2 sm:my-6 sm:text-base",
				)}
			>
				<NavItem to={`/${relayId}/swap`}>Swap</NavItem>
				<NavItem to={`/${relayId}/transfer`}>Transfer</NavItem>
				<NavItem to={`/${relayId}/portfolio`}>
					{accounts.length ? "Portfolio" : "Tokens"}
				</NavItem>
				<NavItem to={`/${relayId}/pools`}>
					<span className="hidden min-[440px]:inline">Liquidity </span>Pools
				</NavItem>
			</div>
		</div>
	);
};
