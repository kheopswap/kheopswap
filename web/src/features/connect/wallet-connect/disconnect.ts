import { setSetting } from "src/services/settings";

export const disconnectWalletConnect = async () => {
	setSetting("hasWalletConnectSession", false);
};
