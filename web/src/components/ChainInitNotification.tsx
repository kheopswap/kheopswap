import { getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import { getSetting, setSetting } from "@kheopswap/settings";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { useRelayChains } from "src/state";

const waitChainReady = async (chainId: ChainId) => {
	const api = await getApi(chainId, false);
	await api.waitReady;
};

const handleSwitchToRpc = () => {
	setSetting("lightClients", false);
	window.location.reload();
};

const handleSwitchToLightClients = () => {
	setSetting("lightClients", true);
	window.location.reload();
};

const LightClientToastContent = () => (
	<div className="flex items-center justify-between gap-4">
		<div>
			<div className="font-medium">Synchronizing light client</div>
			<div className="text-sm text-neutral-400">This may take a moment</div>
		</div>
		<button
			type="button"
			onClick={handleSwitchToRpc}
			className="shrink-0 rounded border border-neutral-500 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-400 hover:text-white"
		>
			Use RPC
		</button>
	</div>
);

const RpcToastContent = () => (
	<div className="flex items-center justify-between gap-4">
		<div>
			<div className="font-medium">Connecting to RPC</div>
			<div className="text-sm text-neutral-400">This shouldn't take long</div>
		</div>
		<button
			type="button"
			onClick={handleSwitchToLightClients}
			className="shrink-0 rounded border border-neutral-500 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-400 hover:text-white"
		>
			Use light client
		</button>
	</div>
);

export const ChainInitNotification = () => {
	const { assetHub } = useRelayChains();

	useEffect(() => {
		if (!assetHub) {
			return;
		}

		// Use getSetting directly to get the current value synchronously
		// This avoids issues with the hook returning undefined initially
		const isLightClients = getSetting("lightClients");

		const promRuntime = waitChainReady(assetHub.id);

		const promIsLoaded = Promise.race([
			promRuntime,
			new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500)),
		]);

		const toastId = `init-${assetHub.id}`;

		promIsLoaded.then((isLoaded) => {
			if (!isLoaded) {
				toast.loading(
					isLightClients ? <LightClientToastContent /> : <RpcToastContent />,
					{ autoClose: false, toastId },
				);

				promRuntime.then(() => {
					toast.dismiss(toastId);
				});
			}
		});

		return () => {
			toast.dismiss(toastId);
		};
		// lightClients is read via getSetting() inside the effect, but we keep
		// the hook call above to trigger re-render when the setting changes
	}, [assetHub]);

	return null;
};
