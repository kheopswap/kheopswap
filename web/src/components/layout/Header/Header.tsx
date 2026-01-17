import { USE_CHOPSTICKS } from "@kheopswap/constants";
import { cn } from "@kheopswap/utils";
import type { FC } from "react";
import { ConnectButton } from "src/components/ConnectButton";
import { RelaySelect } from "./RelaySelect";

export const Header: FC = () => {
	return (
		<div>
			<div
				className={cn(
					"fixed left-0 top-0 z-10 flex h-10 w-full items-center gap-4 bg-pink px-3 text-white shadow-2xl",
					USE_CHOPSTICKS && "bg-warn",
				)}
			>
				<div className="grow truncate font-bold flex items-center gap-1">
					<div>Kheopswap</div>
					{USE_CHOPSTICKS && <div>DEV 🥢</div>}
				</div>
				<RelaySelect />
				<ConnectButton />
			</div>
			<div className="h-10" />
		</div>
	);
};
