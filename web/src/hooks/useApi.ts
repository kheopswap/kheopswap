import { DISABLE_LIGHT_CLIENTS } from "@kheopswap/constants";
import { getApi } from "@kheopswap/papi";
import type { ChainId } from "@kheopswap/registry";
import { useQuery } from "@tanstack/react-query";
import { useSetting } from "./useSetting";

type UseApiProps<Id extends ChainId> = { chainId: Id | null | undefined };

export const useApi = <Id extends ChainId>({ chainId }: UseApiProps<Id>) => {
	const [lightClients] = useSetting("lightClients");
	const effectiveLightClients = !DISABLE_LIGHT_CLIENTS && lightClients;

	return useQuery({
		queryKey: ["api", chainId, effectiveLightClients],
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
