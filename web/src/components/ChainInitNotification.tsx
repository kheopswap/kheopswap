import { useEffect } from "react";
import { toast } from "react-toastify";

import { ChainId } from "src/config/chains";
import { useRelayChains, useSetting } from "src/hooks";
import { getApi } from "src/services/api";

const waitChainReady = async (chainId: ChainId) => {
  const api = await getApi(chainId, false);
  await api.waitReady;
};

export const ChainInitNotification = () => {
  const { relay, assetHub } = useRelayChains();
  const [lightClients] = useSetting("lightClients");

  useEffect(() => {
    if (!relay || !assetHub) {
      return;
    }

    const promRuntime = Promise.all([
      waitChainReady(relay.id),
      waitChainReady(assetHub.id),
    ]);

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
              {lightClients ? "Synchronizing light clients" : "Connecting"}
            </div>
            <div className="text-neutral-500">
              {lightClients
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
  }, [assetHub, lightClients, relay]);

  return null;
};
