import { decAnyMetadata } from "@polkadot-api/substrate-bindings";
import { getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
import { getCachedPromise } from "../utils/getCachedPromise";
import { logger } from "../utils/logger";

export const getMetadataV15 = (chainId: ChainId) =>
	getCachedPromise("getMetadataV15", chainId, async () => {
		try {
			const api = await getApi(chainId);

			const binary = await api.apis.Metadata.metadata_at_version(15);
			if (!binary) throw new Error("Could not fetch metadata");

			const decoded = decAnyMetadata(binary.asBytes());
			if (decoded.metadata.tag !== "v15")
				throw new Error("Unexpected metadata version");

			return decoded.metadata.value;
		} catch (err) {
			logger.error("Failed to fetch metadata v15", { chainId, err });
			return null;
		}
	});
