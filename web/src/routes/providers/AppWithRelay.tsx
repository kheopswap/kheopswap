import { isChainIdRelay } from "@kheopswap/registry";
import type { FC, PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router";
import { ChainInitNotification } from "src/components";

const RelayPathCheck: FC<PropsWithChildren> = ({ children }) => {
	const { relayId } = useParams();

	return isChainIdRelay(relayId) ? (
		children
	) : (
		<Navigate to="/polkadot/swap" replace />
	);
};

export const AppWithRelay: FC = () => {
	return (
		<RelayPathCheck>
			<Outlet />
			<ChainInitNotification />
		</RelayPathCheck>
	);
};
