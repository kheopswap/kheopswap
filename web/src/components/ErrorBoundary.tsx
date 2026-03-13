import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
	fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
	children: ReactNode;
};

type ErrorBoundaryState = {
	error: Error | null;
};

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { error: null };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("[ErrorBoundary]", error, info.componentStack);
		this.props.onError?.(error, info);
	}

	private resetError = () => {
		this.setState({ error: null });
	};

	render() {
		const { error } = this.state;
		if (error) {
			const { fallback } = this.props;
			if (typeof fallback === "function")
				return fallback(error, this.resetError);
			return (
				fallback ?? <ErrorFallback error={error} onReset={this.resetError} />
			);
		}
		return this.props.children;
	}
}

const ErrorFallback = ({
	error,
	onReset,
}: {
	error: Error;
	onReset: () => void;
}) => (
	<div
		role="alert"
		className="flex flex-col items-center gap-3 rounded-sm border border-error/30 bg-error/5 p-6 text-center text-sm text-neutral-400"
	>
		<p className="font-semibold text-error">Something went wrong</p>
		<p className="max-w-sm truncate text-xs text-neutral-500">
			{error.message}
		</p>
		<button
			type="button"
			onClick={onReset}
			className="mt-1 rounded-sm bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-400"
		>
			Try Again
		</button>
	</div>
);
