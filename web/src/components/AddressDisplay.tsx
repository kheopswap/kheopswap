import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { LinkIcon } from "@heroicons/react/24/solid";
import { cn, logger, shortenAddress } from "@kheopswap/utils";
import { notifyError } from "@kheopswap/utils";
import { Polkicon } from "@polkadot-ui/react";
import { TalismanOrb } from "@talismn/orb";
import { type CSSProperties, type FC, useCallback, useMemo } from "react";
import Jazzicon, { jsNumberForAddress } from "react-jazzicon";
import { toast } from "react-toastify";
import { useWallets } from "src/hooks";
import urlJoin from "url-join";
import { useCopyToClipboard } from "usehooks-ts";
import { isAddress as isEvmAddress } from "viem";
import { Pulse } from "./Pulse";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const JAZZICON_PAPER_STYLES: CSSProperties = { width: "100%", height: "100%" };

const JazzIcon: FC<{ address: string; className?: string }> = ({
	address,
	className,
}) => {
	const seed = useMemo(() => jsNumberForAddress(address), [address]);

	return (
		<div className={className}>
			<Jazzicon seed={seed} paperStyles={JAZZICON_PAPER_STYLES} />
		</div>
	);
};

const AddressAvatar: FC<{ address: string; className?: string }> = ({
	address,
	className,
}) => {
	const { accounts } = useWallets();
	const isTalisman = useMemo(
		() =>
			accounts.some((a) => a.address === address && a.wallet === "talisman"),
		[accounts, address],
	);
	const isEvm = useMemo(
		() => isEvmAddress(address, { strict: false }),
		[address],
	);

	return isTalisman ? (
		<TalismanOrb seed={address} className={className} />
	) : isEvm ? (
		<JazzIcon address={address} className={className} />
	) : (
		<Polkicon address={address} className={className} />
	);
};

export const AddressDisplay: FC<{
	address: string;
	blockExporerUrl?: string | null;
	className?: string;
	iconClassName?: string;
	pulse?: boolean;
}> = ({ address, blockExporerUrl, pulse, className, iconClassName }) => {
	const { accounts } = useWallets();
	const [, copyToClipboard] = useCopyToClipboard();

	const account = useMemo(
		() => accounts.find((a) => a.address === address),
		[accounts, address],
	);

	const handleCopyClick = useCallback(async () => {
		try {
			if (await copyToClipboard(address))
				toast.success("Address copied to clipboard");
			else toast.error("Failed to copy address");
		} catch (err) {
			logger.error("Failed to copy address", { err });
			notifyError("Failed to copy address");
		}
	}, [address, copyToClipboard]);

	return (
		<Pulse
			pulse={pulse}
			className={cn("inline-flex gap-1 items-center", className)}
		>
			<AddressAvatar
				address={address}
				className={cn("size-[1.4em]", iconClassName)}
			/>
			<Tooltip>
				<TooltipTrigger onClick={handleCopyClick}>
					{account?.name || shortenAddress(address)}
				</TooltipTrigger>
				<TooltipContent>{address}</TooltipContent>
			</Tooltip>
			{blockExporerUrl ? (
				<a
					href={urlJoin(blockExporerUrl, "account", address)}
					target="_blank"
					rel="noopener noreferrer"
					className={iconClassName}
				>
					<LinkIcon />
				</a>
			) : (
				<button type="button" onClick={handleCopyClick}>
					<DocumentDuplicateIcon className={iconClassName} />
				</button>
			)}
		</Pulse>
	);
};
