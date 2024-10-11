import { type FC, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useRouteError } from "react-router-dom";

import { cn } from "@kheopswap/utils";
import { ModalDialog } from "src/components";
import { DEV } from "src/config/constants";
import { useOpenClose } from "src/hooks";

const ReportIssueButton: FC<{ error: unknown }> = ({ error }) => {
	const { open, close, isOpen } = useOpenClose();
	const [isSending, setIsSending] = useState(false);
	const [sendError, setSendError] = useState<string>();
	const [comments, setComments] = useState("");

	useEffect(() => {
		if (isOpen) setSendError(undefined);
	}, [isOpen]);

	const handleSend = useCallback(async () => {
		if (isSending) return;

		setIsSending(true);
		setSendError(undefined);

		try {
			const { message = "Unknown error", stack = "No stack" } = error as {
				message?: string;
				stack?: string;
			};

			const url = window.location.href;
			const fullText = `Error: ${message}\nFrom: \`${url}\`\nComments: ${comments}\n\nStack: \`\`\`${stack}\`\`\``;

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
				close();
			} else {
				setSendError("Failed to send report");
				setIsSending(false);
			}
		} catch (err) {
			setSendError((err as Error).message ?? "Unknown error");
			setIsSending(false);
		}
	}, [close, comments, error, isSending]);

	return (
		<>
			<button
				type="button"
				className="mt-8 rounded bg-primary p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
				onClick={open}
			>
				Report Bug
			</button>
			<ModalDialog isOpen={isOpen} onClose={close} title="Report Bug">
				<div className="text-neutral-300">
					<p>This will send us the error that you experienced.</p>
					<p>We greatly appreciate this, it will help us improving the site.</p>
				</div>
				<textarea
					className="mt-4 w-full resize-none border border-primary-700 bg-primary-950 p-1 outline-primary focus:outline"
					rows={3}
					placeholder="Your comments (200 characters max)"
					maxLength={200}
					onChange={(e) => setComments(e.target.value)}
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
						className="rounded bg-primary p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
						onClick={close}
					>
						Cancel
					</button>
					<button
						type="button"
						className="relative flex items-center justify-center rounded bg-primary-500 p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
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
									<title>loading</title>
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
			</ModalDialog>
		</>
	);
};

export const ErrorBoundaryPage = () => {
	const error = useRouteError();
	const { relayId } = useParams();
	const navigate = useNavigate();

	const message = useMemo<string>(() => {
		try {
			return (error as Error)?.message ?? error?.toString() ?? "Unknown error";
		} catch (err) {
			console.error("Failed to parse error", { err });
			return "Unknown error";
		}
	}, [error]);

	const goHome = useCallback(
		(reset: boolean) => () => {
			if (reset) localStorage.clear();
			navigate(`/${relayId}`);
		},
		[navigate, relayId],
	);

	return (
		<div className="mt-20 text-center">
			<h1 className="text-4xl font-bold text-neutral-300 sm:text-5xl">Ouch!</h1>
			<p className="mt-4 text-xl text-neutral-500">
				Something terrible happened
			</p>
			<div className="mt-8 text-error">{message}</div>
			<div className="flex justify-center gap-4">
				<button
					type="button"
					className="mt-8 rounded bg-primary-500 p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
					onClick={goHome(false)}
				>
					Home
				</button>
				<ReportIssueButton error={error} />
				{DEV && (
					<button
						type="button"
						className="mt-8 rounded bg-primary-500 p-2 px-3 enabled:hover:bg-primary-400 disabled:opacity-70"
						onClick={goHome(true)}
					>
						Reset
					</button>
				)}
			</div>
		</div>
	);
};
