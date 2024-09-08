import UniversalProvider from "@walletconnect/universal-provider";
import {} from "@walletconnect/universal-provider";
import { Observable, firstValueFrom, shareReplay } from "rxjs";
import { getSetting$ } from "src/services/settings";
import { logger } from "src/util";
import { WALLET_CONNECT_PROVIDER_OPTS } from "./constants";
import { wcSession$ } from "./session.store";

export const wcProvider$ = new Observable<UniversalProvider>((subscriber) => {
	const promProvider = UniversalProvider.init(WALLET_CONNECT_PROVIDER_OPTS);

	const onSessionUpdate = (props: unknown) => {
		logger.debug("[WalletConnect Provider]", "session_update", { props });
	};
	const onSessionDelete = (props: unknown) => {
		logger.debug("[WalletConnect Provider]", "session_delete", { props });
		wcSession$.next(null);
	};
	const onSessionPing = (props: unknown) => {
		logger.debug("[WalletConnect Provider]", "session_ping", { props });
	};
	const onSessionEvent = (props: unknown) => {
		logger.debug("[WalletConnect Provider]", "session_event", { props });
	};
	const onDisplayUri = (props: unknown) => {
		logger.debug("[WalletConnect Provider]", "display_uri", { props });
	};

	promProvider
		.then((provider) => {
			wcSession$.next(provider.session ?? null);
			provider.on("session_update", onSessionUpdate);
			provider.on("session_delete", onSessionDelete);
			provider.on("session_ping", onSessionPing);
			provider.on("session_event", onSessionEvent);
			provider.on("display_uri", onDisplayUri);
			subscriber.next(provider);
		})
		.catch((err) => {
			logger.error("[Wallet Connect] Failed to init provider", { err });
			subscriber.error(err);
		});

	return () => {
		promProvider
			.then((provider) => {
				wcSession$.next(null);
				provider.off("session_update", onSessionUpdate);
				provider.off("session_delete", onSessionDelete);
				provider.off("session_ping", onSessionPing);
				provider.off("session_event", onSessionEvent);
				provider.off("display_uri", onDisplayUri);
				provider.disconnect();
			})
			.catch((err) => {
				logger.error("[Wallet Connect] Failed to init provider (cleanup)", {
					err,
				});
			});
	};
}).pipe(shareReplay(1));

// auto reconnect
firstValueFrom(getSetting$("hasWalletConnectSession")).then(
	(hasWalletConnectSession) => {
		if (hasWalletConnectSession) {
			firstValueFrom(wcProvider$)
				.then((provider) => {
					logger.debug("[Wallet Connect] init provider for auto reconnect", {
						provider,
					});
				})
				.catch((err) => {
					// failed to init provider
					logger.debug(
						"[Wallet Connect] failed to init provider for auto reconnect",
						{ err },
					);
				});
		}
	},
);
