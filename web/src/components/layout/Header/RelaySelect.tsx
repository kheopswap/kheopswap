import { type ChangeEvent, type FC, useCallback, useMemo } from "react";
import { useMatches, useNavigate } from "react-router-dom";

import { USE_CHOPSTICKS } from "@kheopswap/constants";
import {
	type ChainIdRelay,
	getChains,
	isChainIdRelay,
} from "@kheopswap/registry";
import { cn, notifyError } from "@kheopswap/utils";
import { Drawer, DrawerContainer, Styles } from "src/components";
import { ActionRightIcon } from "src/components/icons";
import { useOpenClose, useSetting } from "src/hooks";
import { useRelayChains } from "src/state";

const ChainButton: FC<{
	onClick: () => void;
	logo: string;
	name: string;
	selected?: boolean;
}> = ({ onClick, logo, name, selected }) => (
	<button
		type="button"
		onClick={onClick}
		className={cn(
			Styles.button,
			"flex w-full items-center gap-4  overflow-hidden rounded-md p-2 py-3 pl-4 pr-3",
			selected && "ring-1 ring-neutral-500",
		)}
	>
		<img loading="lazy" src={logo} alt="" className="size-8 shrink-0" />
		<div className="grow truncate text-left text-lg">{name}</div>
		<ActionRightIcon className="size-5 shrink-0 fill-current" />
	</button>
);

const DrawerContent: FC<{
	relayId: ChainIdRelay;
	onChange: (relayId: ChainIdRelay) => void;
	onClose: () => void;
}> = ({ relayId, onChange, onClose }) => {
	const [lightClient, setLightClient] = useSetting("lightClients");

	const handleClick = useCallback(
		(relayId: ChainIdRelay) => async () => {
			onChange(relayId);
			onClose();
		},
		[onChange, onClose],
	);

	const handleSetLightClients = useCallback(
		async (e: ChangeEvent<HTMLInputElement>) => {
			if (USE_CHOPSTICKS) {
				notifyError(
					new Error("Light clients are not supported in chopsticks mode"),
				);
				return false;
			}
			setLightClient(e.target.checked);
			onClose();
			window.location.reload();
		},
		[onClose, setLightClient],
	);

	const relays = useMemo(
		() => getChains().filter(({ id }) => isChainIdRelay(id)),
		[],
	);

	return (
		<div className="flex flex-col items-start gap-4">
			<div className="flex w-full flex-col items-start gap-2">
				<div>Relay network</div>
				{relays.map((c) => (
					<ChainButton
						key={c.id}
						onClick={handleClick(c.id as ChainIdRelay)}
						logo={c.logo}
						name={c.name}
						selected={c.id === relayId}
					/>
				))}
			</div>
			<div>
				<label
					htmlFor="cbLightClient"
					className="group flex w-full items-center justify-between"
				>
					<div className="grow">Connect via light clients</div>

					<div
						className={cn(
							"relative inline-flex cursor-pointer items-center",
							USE_CHOPSTICKS && "opacity-50 cursor-not-allowed",
						)}
					>
						<input
							id="cbLightClient"
							type="checkbox"
							className="peer sr-only"
							defaultChecked={lightClient && !USE_CHOPSTICKS}
							onChange={handleSetLightClients}
							disabled={USE_CHOPSTICKS}
						/>
						<div
							className={cn(
								"h-6 w-11 rounded-full border bg-transparent ",
								"after:absolute after:left-[2px] after:top-0.5 after:size-5 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-['']",
								"peer-checked:bg-neutral-500 peer-checked:after:translate-x-full peer-checked:after:border-neutral-200 peer-focus-visible:ring-1 peer-focus-visible:ring-neutral-200",
							)}
						/>
					</div>
				</label>
				<div className="mt-1 text-sm text-neutral-500">
					{USE_CHOPSTICKS ? (
						<>Light clients are not available when using Chopsticks</>
					) : (
						<>
							Light clients are blockchain nodes running in your browser. They
							provide secure and uncensorable connections to Polkadot networks.
							<br />
							Pro-tip: get{" "}
							<a
								href="https://substrate.io/developers/substrate-connect/"
								className="text-neutral-300 underline hover:text-neutral-200"
								target="_blank"
								rel="noreferrer"
							>
								Substrate Connect
							</a>{" "}
							browser extension to share light clients across all your browser
							apps.
						</>
					)}
				</div>
			</div>
		</div>
	);
};

export const RelaySelect = () => {
	const { relay } = useRelayChains();
	const navigate = useNavigate();
	const { open, close, isOpen } = useOpenClose();

	const matches = useMatches();

	const handleChainSelect = useCallback(
		(relayId: ChainIdRelay) => {
			const last = matches[matches.length - 1];
			if (last?.params?.relayId) {
				const newPath = last.pathname.replace(
					`/${last.params.relayId}`,
					`/${relayId}`,
				);
				navigate(newPath);
			} else navigate(`/${relayId}/swap`);
			close();
		},
		[matches, navigate, close],
	);

	return (
		<>
			<button type="button" onClick={open}>
				<img loading="lazy" src={relay.logo} alt="Chain" className="size-6" />
			</button>
			<Drawer anchor="right" isOpen={isOpen} onDismiss={close}>
				<DrawerContainer title="Select network" onClose={close}>
					<DrawerContent
						relayId={relay.id}
						onChange={handleChainSelect}
						onClose={close}
					/>
				</DrawerContainer>
			</Drawer>
		</>
	);
};
