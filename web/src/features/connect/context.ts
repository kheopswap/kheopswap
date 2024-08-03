import { useOpenClose } from "src/hooks";
import { provideContext } from "src/util";

const useConnectDrawerProvider = () => useOpenClose();

export const [ConnectDrawerProvider, useConnectDrawer] = provideContext(
	useConnectDrawerProvider,
);
