import { useQuery } from "@tanstack/react-query";

import { useSetting } from "./useSetting";

import { getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";

type UseApiProps<Id extends ChainId> = { chainId: Id | null | undefined };

export const useApi = <Id extends ChainId>({ chainId }: UseApiProps<Id>) => {
	const [lightClients] = useSetting("lightClients");

	return useQuery({
		queryKey: ["api", chainId, lightClients],
		queryFn: () => {
			if (!chainId) return null;
			return getApi(chainId, true);
		},
		refetchInterval: false,
		refetchIntervalInBackground: false,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
		structuralSharing: false,
	});
};
