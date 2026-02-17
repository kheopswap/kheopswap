import type { FC } from "react";
import { ConnectButton } from "src/components/ConnectButton";
import { RelaySelect } from "./RelaySelect";

export const Header: FC = () => {
	return (
		<div>
			<div className="fixed left-0 top-0 z-10 flex h-10 w-full items-center gap-4 bg-pink px-3 text-white shadow-2xl">
				<div className="grow truncate font-bold flex items-center gap-1">
					<div>Kheopswap</div>
				</div>
				<RelaySelect />
				<ConnectButton />
			</div>
			<div className="h-10" />
		</div>
	);
};
