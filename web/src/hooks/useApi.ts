import { useQuery } from "@tanstack/react-query";
import { DISABLE_LIGHT_CLIENTS } from "../common/constants";
import { getApi } from "../papi/getApi";
import type { ChainId } from "../registry/chains/types";
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
