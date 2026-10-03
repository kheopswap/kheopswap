import { useDeferredValue } from "react";
import { useLoadingStatusSummary } from "../../hooks/useLoadingStatusSummary";
import { ErrorBoundary } from "../ErrorBoundary";
import { DiscordIcon, GitHubIcon, XDotComIcon } from "../icons";
import { ChainBlockNumbers } from "./ChainBlockNumbers";

const LoadingStatus = () => {
	const { loaded, total } = useDeferredValue(useLoadingStatusSummary());
	return (
		<div>
			{loaded}/{total} active subscriptions
		</div>
	);
};

export const Footer = () => {
	return (
		<div className="flex w-full flex-col items-center gap-3 border-t border-line px-6 py-5 text-center font-mono text-xs text-muted sm:flex-row sm:justify-between sm:gap-6 sm:text-left">
			<div>
				<ErrorBoundary fallback={null}>
					<ChainBlockNumbers />
				</ErrorBoundary>
			</div>
			<div className="flex flex-col items-center gap-1 text-center">
				<div>
					Powered by{" "}
					<a
						href="https://papi.how"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-text"
					>
						polkadot-api
					</a>{" "}
					and{" "}
					<a
						href="https://github.com/kheopskit/kheopskit"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-text"
					>
						kheopskit
					</a>
				</div>
				<LoadingStatus />
			</div>
			<div className="flex items-center gap-4">
				<a
					href="https://x.com/kheopswap"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-text"
					title="Follow us on X.com"
				>
					<XDotComIcon className="inline-block size-5" />
				</a>
				<a
					href="https://discord.gg/JCVsDuwbzt"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-text"
					title="Join us on Discord"
				>
					<DiscordIcon className="inline-block size-5" />
				</a>
				<a
					href="https://github.com/kheopswap/kheopswap"
					target="_blank"
					rel="noopener noreferrer"
					className="hover:text-text"
					title="Kheopswap GitHub repository"
				>
					<GitHubIcon className="inline-block size-5" />
				</a>
			</div>
		</div>
	);
};
