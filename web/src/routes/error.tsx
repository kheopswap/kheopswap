import { useCallback, useMemo } from "react";
import { useNavigate, useParams, useRouteError } from "react-router";
import { DEV } from "../common/constants";

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
			<h1 className="text-4xl font-bold text-text sm:text-5xl">Ouch!</h1>
			<p className="mt-4 text-xl text-muted">Something terrible happened</p>
			<div className="mt-8 text-error">{message}</div>
			<div className="flex justify-center gap-4">
				<button
					type="button"
					className="mt-8 rounded-control bg-primary p-2 px-3 font-semibold text-primary-ink enabled:hover:brightness-108 disabled:opacity-70"
					onClick={goHome(false)}
				>
					Home
				</button>
				{DEV && (
					<button
						type="button"
						className="mt-8 rounded-control bg-primary p-2 px-3 font-semibold text-primary-ink enabled:hover:brightness-108 disabled:opacity-70"
						onClick={goHome(true)}
					>
						Reset
					</button>
				)}
			</div>
		</div>
	);
};
