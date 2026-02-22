import { Switch } from "@base-ui/react/switch";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { type FC, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { DISABLE_LIGHT_CLIENTS } from "../../../common/constants";
import { useOpenClose } from "../../../hooks/useOpenClose";
import { useSetting } from "../../../hooks/useSetting";
import { getChains } from "../../../registry/chains/chains";
import type { RelayId } from "../../../registry/chains/types";
import { useRelayChains } from "../../../state/relay";
import { cn } from "../../../utils/cn";
import { Drawer } from "../../Drawer";
import { DrawerContainer } from "../../DrawerContainer";
import { ActionRightIcon } from "../../icons";
import { Styles } from "../../styles";

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
	relayId: RelayId;
	onChange: (relayId: RelayId) => void;
	onClose: () => void;
}> = ({ relayId, onChange, onClose }) => {
	const [lightClient, setLightClient] = useSetting("lightClients");
	const effectiveLightClient = !DISABLE_LIGHT_CLIENTS && lightClient;

	const handleClick = useCallback(
		(relayId: RelayId) => () => {
			onChange(relayId);
		},
		[onChange],
	);

	const handleSetLightClients = useCallback(
		async (checked: boolean): Promise<void> => {
			if (DISABLE_LIGHT_CLIENTS) return;
			setLightClient(checked);
			onClose();
			window.location.reload();
		},
		[onClose, setLightClient],
	);

	const assetHubs = getChains();

	return (
		<div className="flex flex-col items-start gap-4">
			<div className="flex w-full flex-col items-start gap-2">
				<div>Network</div>
				{assetHubs.map((c) => (
					<ChainButton
						key={c.id}
						onClick={handleClick(c.relay)}
						logo={c.logo}
						name={c.name}
						selected={c.relay === relayId}
					/>
				))}
			</div>
			{DISABLE_LIGHT_CLIENTS && (
				<div className="mt-1 text-sm bg-warn/10 text-warn p-2 rounded w-full border border-warn/20 flex items-center gap-2">
					<ExclamationTriangleIcon className="size-6 inline mr-2" />
					Light clients are temporarily disabled.
				</div>
			)}
			<div
				className={cn(
					DISABLE_LIGHT_CLIENTS && "opacity-50 pointer-events-none",
				)}
			>
				<div className="group flex w-full items-center justify-between">
					<div className="grow">Connect via light clients</div>

					<Switch.Root
						checked={effectiveLightClient}
						onCheckedChange={handleSetLightClients}
						disabled={DISABLE_LIGHT_CLIENTS}
						className={cn(
							"relative inline-flex h-6 w-11 items-center rounded-full border bg-transparent transition-colors",
							"data-checked:bg-neutral-500",
							"focus-visible:ring-1 focus-visible:ring-neutral-200",
							!DISABLE_LIGHT_CLIENTS && "cursor-pointer",
							DISABLE_LIGHT_CLIENTS && "opacity-50",
						)}
					>
						<Switch.Thumb
							className={cn(
								"absolute left-0.5 top-0.5 size-5 rounded-full border border-neutral-300 bg-white transition-transform",
								"data-checked:translate-x-full data-checked:border-neutral-200",
							)}
						/>
					</Switch.Root>
				</div>

				<div className="mt-1 text-sm text-neutral-500">
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
					browser extension to share light clients across all your browser apps.
				</div>
			</div>
		</div>
	);
};

export const RelaySelect = () => {
	const { assetHub, relayId } = useRelayChains();
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { open, close, isOpen } = useOpenClose();

	const getRelayPath = useCallback(
		(newRelayId: RelayId) => {
			const segments = pathname.split("/").filter(Boolean);
			if (segments[0] === relayId) {
				segments[0] = newRelayId;
				return `/${segments.join("/")}`;
			} else {
				return `/${newRelayId}/swap`;
			}
		},
		[pathname, relayId],
	);

	const handleChangeRelay = useCallback(
		(newRelayId: RelayId) => {
			navigate(getRelayPath(newRelayId));
			close();
		},
		[navigate, getRelayPath, close],
	);

	return (
		<>
			<button type="button" onClick={open}>
				<img
					loading="lazy"
					src={assetHub.logo}
					alt="Chain"
					className="size-6"
				/>
			</button>
			<Drawer anchor="right" isOpen={isOpen} onDismiss={close}>
				<DrawerContainer title="Select network" onClose={close}>
					<DrawerContent
						relayId={relayId}
						onChange={handleChangeRelay}
						onClose={close}
					/>
				</DrawerContainer>
			</Drawer>
		</>
	);
};
