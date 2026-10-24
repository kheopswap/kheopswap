import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { Layout } from "./layout/Layout";
import { PageContent } from "./layout/PageContent";
import { Styles } from "./styles";
import { TabTitle } from "./TabTitle";

type NotFoundProps = {
	title: string;
	children: ReactNode;
	backTo: { to: string; label: string };
};

export const NotFound: FC<NotFoundProps> = ({ title, children, backTo }) => (
	<PageContent>
		<div className="flex flex-col items-center gap-4 py-6 text-center">
			<h1 className="text-2xl font-bold text-text">{title}</h1>
			<p className="text-muted">{children}</p>
			<Link to={backTo.to} className={Styles.primaryButton}>
				{backTo.label}
			</Link>
		</div>
	</PageContent>
);

export const NotFoundPage: FC<NotFoundProps> = (props) => (
	<Layout>
		<NotFound {...props} />
		<TabTitle title={props.title} />
	</Layout>
);
