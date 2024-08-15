import { DocumentDuplicateIcon } from "@heroicons/react/24/outline";
import { LinkIcon } from "@heroicons/react/24/solid";
import { Polkicon } from "@polkadot-ui/react";
import { TalismanOrb } from "@talismn/orb";
import { type FC, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { useWallets } from "src/hooks";
import { cn, logger, notifyError, shortenAddress } from "src/util";
import urlJoin from "url-join";
import { useCopyToClipboard } from "usehooks-ts";

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

	return isTalisman ? (
		<TalismanOrb seed={address} className={className} />
	) : (
		<Polkicon address={address} className={className} />
	);
};

export const AddressDisplay: FC<{
	address: string;
	blockExporerUrl?: string | null;
	className?: string;
	iconClassName?: string;
}> = ({ address, blockExporerUrl, className, iconClassName }) => {
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
		<div className={cn("inline-flex gap-1 items-center", className)}>
			<AddressAvatar
				address={address}
				className={cn("size-[1.4em]", iconClassName)}
			/>
			<div>{account?.name || shortenAddress(address)}</div>
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
		</div>
	);
};
