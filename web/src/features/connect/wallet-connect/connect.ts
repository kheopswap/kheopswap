import { WALLET_CONNECT_PROJECT_ID } from "@kheopswap/constants";
import { logger, notifyError } from "@kheopswap/utils";
import { WalletConnectModal } from "@walletconnect/modal";
import { firstValueFrom } from "rxjs";
import {
	WALLET_CONNECT_CHAINS,
	WALLET_CONNECT_CONNECT_PARAMS,
} from "./constants";
import { wcProvider$ } from "./provider.state";
import { wcSession$ } from "./session.store";

const wcModal = new WalletConnectModal({
	projectId: WALLET_CONNECT_PROJECT_ID,
	chains: WALLET_CONNECT_CHAINS,
	desktopWallets: [],
	enableAuthMode: false,
	enableExplorer: false,
	explorerRecommendedWalletIds: [],
	explorerExcludedWalletIds: [],
});

export const connectWalletConnect = async () => {
	logger.info("[Wallet Connect]", "connectWalletConnectClient()");

	const provider = await firstValueFrom(wcProvider$);

	if (!provider) {
		logger.warn("[Wallet Connect]", "no provider to connect with", {
			provider,
		});
		return;
	}

	try {
		// biome-ignore lint/style/noVar: <explanation>
		// biome-ignore lint/correctness/noInnerDeclarations: <explanation>
		var { uri, approval } = await provider.client.connect(
			WALLET_CONNECT_CONNECT_PARAMS,
		);
		if (!uri) throw new Error("No URI");
	} catch (cause) {
		logger.error("Failed to connect to wallet connect", { cause });
		notifyError(new Error("Failed to connect", { cause }));
		return;
	}

	try {
		await wcModal.openModal({ uri });

		const session = await Promise.race([
			approval(),
			new Promise<null>((resolve) => {
				const unsubscribe = wcModal.subscribeModal(
					({ open }: { open: boolean }) => {
						if (open) return;
						unsubscribe();
						resolve(null);
					},
				);
			}),
		]);

		if (session) wcSession$.next(session);

		logger.debug("[Wallet Connect] after aproval", { session });

		wcModal.closeModal();
	} catch (err) {
		console.error("Failed to connect to wallet connect", { err });
	} finally {
		wcModal.closeModal();
	}
};
