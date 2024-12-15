import { Layout, PageContent } from "src/components";
import { Operation } from "src/features/operation/Operation";

export const OperationPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Operation />
			</PageContent>
		</div>
	</Layout>
);
