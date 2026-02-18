import type { FC, PropsWithChildren } from "react";
import { Navigate, Outlet, useParams } from "react-router";
import { ChainInitNotification } from "../../components/ChainInitNotification";
import { getRelayIds } from "../../registry/chains/chains";

const RelayPathCheck: FC<PropsWithChildren> = ({ children }) => {
	const { relayId } = useParams();

	const validRelayIds = getRelayIds();
	return validRelayIds.includes(relayId as (typeof validRelayIds)[number]) ? (
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
