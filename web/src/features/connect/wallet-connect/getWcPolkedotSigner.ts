import { logger } from "@kheopswap/utils";
import type { PolkadotSigner } from "@polkadot-api/polkadot-signer";
import { getPolkadotSignerFromPjs } from "polkadot-api/pjs-signer";
import { firstValueFrom } from "rxjs";
import { wcProvider$ } from "./provider.state";
import { wcSession$ } from "./session.store";

export const getWcPolkadotSigner = (address: string): PolkadotSigner => {
	return getPolkadotSignerFromPjs(
		address,
		async (payload) => {
			const [provider, session] = await Promise.all([
				firstValueFrom(wcProvider$),
				firstValueFrom(wcSession$),
			]);

			logger.debug("[Wallet Connect] signTx", {
				payload,
				provider,
			});

			if (!provider) throw new Error("Provider not found");
			if (!provider.client) throw new Error("Client not found");
			if (!session) throw new Error("Session not found");

			return provider.client.request<{ signature: string }>({
				topic: session.topic,
				chainId: `polkadot:${payload.genesisHash.substring(2, 34)}`,
				request: {
					method: "polkadot_signTransaction",
					params: {
						address: payload.address,
						transactionPayload: payload,
					},
				},
			});
		},
		async (_payload) => {
			throw new Error("signRaw not implemented");

			// Code below should work but we don't have any feature that requires raw signing atm, so it's untested

			// const provider = await firstValueFrom(wcProvider$);
			// if (!provider) throw new Error("Provider not found");
			// if (!provider.client) throw new Error("Client not found");
			// console.log("provider", provider);
			// if (!provider.session) throw new Error("Session not found");

			// const accounts = provider.session.namespaces.polkadot?.accounts ?? [];
			// const account = accounts.find(
			// 	(acc) => acc.split(":")[2] === payload.address,
			// );
			// if (!account) throw new Error("Account not found");

			// const chainId = provider.session.topic.split(":")[1];

			// const { signature } = await provider.client.request<{
			// 	signature: `0x${string}`;
			// }>({
			// 	topic: provider.session.topic,
			// 	chainId: `polkadot:${chainId}`,
			// 	request: {
			// 		method: "polkadot_signMessage",
			// 		params: { address: payload.address, message: payload.data },
			// 	},
			// });

			// return { id: requestId++, signature };
		},
	);
};
