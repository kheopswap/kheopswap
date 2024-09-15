import { bind } from "@react-rxjs/core";
import { wcAccounts$ } from "./accounts.state";
import { connectWalletConnect } from "./connect";
import { disconnectWalletConnect } from "./disconnect";

export { WALLET_CONNECT_NAME } from "./constants";

export const walletConnect = {
	connect: connectWalletConnect,
	disconnect: disconnectWalletConnect,
};

export const [useWalletConnectAccounts] = bind(wcAccounts$);
