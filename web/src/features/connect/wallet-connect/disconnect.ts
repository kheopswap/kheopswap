import { logger } from "@kheopswap/utils";
import type { EngineTypes } from "@walletconnect/types";
import { getSdkError } from "@walletconnect/utils";
import { firstValueFrom } from "rxjs";
import { wcProvider$ } from "./provider.state";
import { wcSession$ } from "./session.store";

export const disconnectWalletConnect = async () => {
	wcSession$.next(null);

	// attempt to kill remote session
	try {
		const provider = await firstValueFrom(wcProvider$);
		if (provider.session) {
			await provider.client.disconnect({
				reason: getSdkError("USER_DISCONNECTED"),
				topic: provider.session.topic,
			} as EngineTypes.DisconnectParams);
		}
	} catch (err) {
		logger.error("[Wallet Connect] Failed to disconnect", { err });
	}
};
