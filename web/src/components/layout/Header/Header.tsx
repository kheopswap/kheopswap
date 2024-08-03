import type { FC } from "react";

import { RelaySelect } from "./RelaySelect";

import { ConnectButton } from "src/features/connect/ConnectButton";

export const Header: FC = () => {
	return (
		<div>
			<div className="fixed left-0 top-0 z-10 flex h-10 w-full items-center gap-4 bg-pink px-3 text-white shadow-2xl">
				<div className="grow truncate font-bold">Kheopswap</div>
				<RelaySelect />
				<ConnectButton />
			</div>
			<div className="h-10"></div>
		</div>
	);
};
