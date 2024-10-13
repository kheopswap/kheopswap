import type { FC, PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

import { isChainIdRelay } from "@kheopswap/registry";
import { ChainInitNotification } from "src/components";
import { RelayChainsProvider } from "src/hooks";

const RelayPathCheck: FC<PropsWithChildren> = ({ children }) => {
	const { relayId } = useParams();

	return isChainIdRelay(relayId) ? (
		<>{children}</>
	) : (
		<Navigate to="/polkadot/swap" replace />
	);
};

export const AppWithRelay: FC = () => {
	return (
		<RelayPathCheck>
			<RelayChainsProvider>
				<Outlet />
				<ChainInitNotification />
			</RelayChainsProvider>
		</RelayPathCheck>
	);
};
