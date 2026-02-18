import { useEffect } from "react";
import { toast } from "react-toastify";
import { DISABLE_LIGHT_CLIENTS } from "../common/constants";
import { useSetting } from "../hooks/useSetting";
import { getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
import { useRelayChains } from "../state/relay";

const waitChainReady = async (chainId: ChainId) => {
	const api = await getApi(chainId, false);
	await api.waitReady;
};

export const ChainInitNotification = () => {
	const { assetHub } = useRelayChains();
	const [lightClients] = useSetting("lightClients");
	const effectiveLightClient = !DISABLE_LIGHT_CLIENTS && lightClients;

	useEffect(() => {
		if (!assetHub) {
			return;
		}

		const promRuntime = waitChainReady(assetHub.id);

		const promIsLoaded = Promise.race([
			promRuntime,
			new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500)),
		]);

		const toastId = `init-${assetHub.id}`;

		promIsLoaded.then((isLoaded) => {
			if (!isLoaded) {
				toast.loading(
					<div>
						<div>
							{effectiveLightClient
								? "Synchronizing light clients"
								: "Connecting"}
						</div>
						<div className="text-neutral-500">
							{effectiveLightClient
								? "It may take some time"
								: "This shouldn't be long"}
						</div>
					</div>,
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
	}, [assetHub, effectiveLightClient]);

	return null;
};
