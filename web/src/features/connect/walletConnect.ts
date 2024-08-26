import { WalletConnectModal } from "@walletconnect/modal";
import UniversalProvider, {} from "@walletconnect/universal-provider";
import { WALLET_CONNECT_PROJECT_ID } from "src/config/constants";

const WALLET_CONNECT_CHAINS = [
	"polkadot:91b171bb158e2d3848fa23a9f1c25182", // polkadot
	"polkadot:68d56f15f85d3136970ec16946040bc1", // polkadot asset hub
]

export const connectWalletConnectClient = async () => {
	const walletConnectProvider = await UniversalProvider.init({
		projectId: WALLET_CONNECT_PROJECT_ID,
		relayUrl: "wss://relay.walletconnect.com",
	});

	const params = {
		requiredNamespaces: {
			polkadot: {
				methods: ["polkadot_signTransaction", "polkadot_signMessage"],
				chains: WALLET_CONNECT_CHAINS,
				events: ['chainChanged", "accountsChanged'],
			},
		},
	};

	const { uri, approval } = await walletConnectProvider.client.connect(params);

	// TODO should this be instanciated only once, globally ?
	const walletConnectModal = new WalletConnectModal({
		projectId: WALLET_CONNECT_PROJECT_ID,
		chains: WALLET_CONNECT_CHAINS,
		desktopWallets: [],
		enableAuthMode: false,
		enableExplorer: false,
		explorerRecommendedWalletIds: [],
		explorerExcludedWalletIds: [],
	});

	// if there is a URI from the client connect step open the modal
	if (uri) {
		walletConnectModal.openModal({ uri });
	}

	// await session approval from the wallet app
	const walletConnectSession = await approval();

	const wcAccounts = Object.values(walletConnectSession.namespaces).flatMap(
		(namespace) => namespace.accounts,
	);

	// grab account addresses from CAIP account formatted accounts
	const accounts = wcAccounts.map((wcAccount) => {
		const address = wcAccount.split(":")[2];
		return address;
	});

	return accounts;
};

// const walletConnectModal = new WalletConnectModal({
// 	projectId: "2ea3f3ghubh32b8ie2f2",
// });

// const showWalletConnectModal = async () => {};
