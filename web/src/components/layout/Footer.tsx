import { cn } from "@kheopswap/utils";
import {
	type FC,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from "react";
import { ModalDialog } from "src/components";
import { DiscordIcon, GitHubIcon, XDotComIcon } from "src/components/icons";
import { useLoadingStatusSummary, useOpenClose } from "src/hooks";

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
			<div className="w-16">
				<FeedbackButton />
			</div>
			<div className="hidden flex-col items-center gap-1 text-center text-xs text-neutral-500 sm:flex">
				<div className="">Powered by polkadot-api and smoldot</div>
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

const FeedbackButton = () => {
	const oFeedback = useOpenClose();
	const oFeedbackSent = useOpenClose();

	const handleFeedbackSent = useCallback(() => {
		oFeedback.close();
		oFeedbackSent.open();
	}, [oFeedback, oFeedbackSent]);

	return (
		<>
			<button
				type="button"
				onClick={oFeedback.open}
				className="hover:text-neutral-200"
			>
				Feedback
			</button>
			<ModalDialog
				title="Feedback"
				isOpen={oFeedback.isOpen}
				onClose={oFeedback.close}
			>
				<FeedbackContent
					onClose={oFeedback.close}
					onSent={handleFeedbackSent}
				/>
			</ModalDialog>
			<ModalDialog
				title="Feedback Sent"
				isOpen={oFeedbackSent.isOpen}
				onClose={oFeedbackSent.close}
			>
				<div>
					Your feedback has been sent, thank you so much for helping us
					improving Kheopswap.
				</div>
				<div className="mt-4 flex w-full justify-end">
					<button
						type="button"
						onClick={oFeedbackSent.close}
						className="rounded-sm bg-primary p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
					>
						Close
					</button>
				</div>
			</ModalDialog>
		</>
	);
};

const FeedbackContent: FC<{ onClose: () => void; onSent: () => void }> = ({
	onClose,
	onSent,
}) => {
	const [feedback, setFeedback] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [sendError, setSendError] = useState<string>();

	const refTextArea = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		refTextArea.current?.focus();
	}, []);

	useEffect(() => {
		return () => setSendError(undefined);
	}, []);

	const handleSend = useCallback(async () => {
		if (isSending) return;

		setIsSending(true);
		setSendError(undefined);

		try {
			const fullText = `**Feedback**\n\n${feedback}`;

			const body = JSON.stringify({
				content: fullText.substring(0, 2000),
			});

			const req = await fetch(
				"https://discord.com/api/webhooks/1241406651190218802/LL0JCjJGCuCyZjuaDlw8Z1T5XIhuQFP5lGGhgcsx4QUNFrEzwy3n9gw9-ZBHQbNj3LpR",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body,
				},
			);

			if (req.ok) {
				setIsSending(false);
				onSent();
			} else {
				setSendError("Failed to send report");
				setIsSending(false);
			}
		} catch (err) {
			setSendError((err as Error).message ?? "Unknown error");
			setIsSending(false);
		}
	}, [feedback, isSending, onSent]);

	return (
		<div className="text-neutral-300">
			<p>Your anonymous feedback will help us improving the website. Shoot!</p>
			<p className="mt-4 text-xs font-light text-neutral-500">
				Feedbacks are anonymous and one-way only.
				<br />
				If you expect an answer, please contact us on our Discord server
				instead, or create a Github issue.
				<br />
				Links to those are in the bottom right of the screen.
			</p>
			<textarea
				ref={refTextArea}
				className="mt-4 w-full resize-none border border-primary-700 bg-primary-950 p-1 outline-primary focus:outline-solid"
				rows={5}
				placeholder="Your feedback (400 characters max)"
				maxLength={400}
				onChange={(e) => setFeedback(e.target.value)}
			/>
			<div className="mt-2 text-error">
				{sendError ?? (
					<span className="pointer-events-none cursor-default text-transparent">
						placeholder
					</span>
				)}
			</div>
			<div className="flex justify-end gap-4">
				<button
					type="button"
					className="rounded-sm bg-primary p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
					onClick={onClose}
				>
					Cancel
				</button>
				<button
					type="button"
					disabled={!feedback.length}
					className="relative flex items-center justify-center rounded-sm bg-primary-500 p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
					onClick={handleSend}
				>
					<span className={cn(isSending && "invisible")}>Send</span>
					{isSending && (
						<div className="absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2">
							<svg
								className=" size-5  animate-spin text-white"
								fill="none"
								viewBox="0 0 24 24"
							>
								<title>spinner</title>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
						</div>
					)}
				</button>
			</div>
		</div>
	);
};
