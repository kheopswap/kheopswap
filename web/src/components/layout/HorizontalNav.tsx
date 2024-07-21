import { ComponentProps, FC } from "react";
import { NavLink, useParams } from "react-router-dom";

import { cn } from "src/util";

const NavItem: FC<ComponentProps<typeof NavLink>> = ({ to, children }) => {
  return (
    <NavLink
      to={to}
      className={cn(
        "rounded-xl  px-3 py-1 text-base text-neutral-50 opacity-50",
        "hover:opacity-100 [&.active]:bg-pink [&.active]:opacity-100",
      )}
    >
      {children}
    </NavLink>
  );
};

export const HorizontalNav: FC = () => {
  const { relayId } = useParams();
  return (
    <div>
      <div className={cn("my-2 flex w-full justify-center gap-2 px-2 sm:my-6")}>
        <NavItem to={`/${relayId}/swap`}>Swap</NavItem>
        <NavItem to={`/${relayId}/teleport`}>Teleport</NavItem>
        <NavItem to={`/${relayId}/transfer`}>Transfer</NavItem>
        <NavItem to={`/${relayId}/pools`}>
          <span className="hidden sm:inline">Liquidity </span>Pools
        </NavItem>
        <NavItem to={`/${relayId}/portfolio`}>P</NavItem>
      </div>
    </div>
  );
};
