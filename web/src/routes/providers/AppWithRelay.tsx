import type { FC, PropsWithChildren } from "react";
import { Outlet, useParams } from "react-router";
import { ChainInitNotification } from "../../components/ChainInitNotification";
import { NotFoundPage } from "../../components/NotFoundPage";
import { getRelayIds } from "../../registry/chains/chains";

const RelayPathCheck: FC<PropsWithChildren> = ({ children }) => {
	const { relayId } = useParams();

	const validRelayIds = getRelayIds();
	return validRelayIds.includes(relayId as (typeof validRelayIds)[number]) ? (
		children
	) : (
		<NotFoundPage
			title="Network not found"
			backTo={{ to: "/polkadot/swap", label: "Go to Polkadot" }}
		>
			{relayId} is not a supported network.
		</NotFoundPage>
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
