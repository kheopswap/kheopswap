import { useDeferredValue } from "react";
import { DiscordIcon, GitHubIcon, XDotComIcon } from "src/components/icons";
import { useLoadingStatusSummary } from "src/hooks";
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
		<div className="flex w-full items-center justify-between gap-6 bg-black/20 px-4 py-3 text-xs text-neutral-300 sm:px-6">
			<div>
				<ChainBlockNumbers />
			</div>
			<div className="hidden flex-col items-center gap-1 text-center text-xs text-neutral-500 sm:flex">
				<div className="">Powered by polkadot-api and kheopskit</div>
				<LoadingStatus />
			</div>
			<div className="flex items-center gap-4">
				<a
					href="https://x.com/kheopswap"
					target="_blank"
					rel="noopener noreferrer"
					className="text-neutral-400 hover:text-neutral-300"
					title="Follow us on X.com"
				>
					<XDotComIcon className="inline-block size-6 fill-transparent opacity-80 hover:opacity-100" />
				</a>
				<a
					href="https://discord.gg/JCVsDuwbzt"
					target="_blank"
					rel="noopener noreferrer"
					className="text-neutral-400"
					title="Join us on Discord"
				>
					<DiscordIcon className="inline-block size-6 fill-neutral-400 opacity-50 hover:opacity-70" />
				</a>
				<a
					href="https://github.com/kheopswap/kheopswap"
					target="_blank"
					rel="noopener noreferrer"
					className="text-neutral-400"
					title="Kheopswap GitHub repository"
				>
					<GitHubIcon className="inline-block size-6 fill-neutral-400 opacity-50 hover:opacity-70" />
				</a>
			</div>
		</div>
	);
};
