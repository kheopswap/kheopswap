import type { FC, PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router-dom";

import { ChainInitNotification } from "src/components";
import { isChainIdRelay } from "src/config/chains";
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
