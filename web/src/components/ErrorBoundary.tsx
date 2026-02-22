import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
	fallback?: ReactNode | ((error: Error) => ReactNode);
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
	}

	render() {
		const { error } = this.state;
		if (error) {
			const { fallback } = this.props;
			if (typeof fallback === "function") return fallback(error);
			return fallback ?? <ErrorFallback error={error} />;
		}
		return this.props.children;
	}
}

const ErrorFallback = ({ error }: { error: Error }) => (
	<div
		role="alert"
		className="flex flex-col items-center gap-2 rounded-sm border border-error/30 bg-error/5 p-6 text-center text-sm text-neutral-400"
	>
		<p className="font-semibold text-error">Something went wrong</p>
		<p className="max-w-sm truncate text-xs text-neutral-500">
			{error.message}
		</p>
	</div>
);
