import { Layout, PageContent, TabTitle } from "src/components";
import { Teleport } from "src/features/teleport";

export const TeleportPage = () => (
	<Layout>
		<div className="p-2">
			<PageContent>
				<Teleport />
			</PageContent>
		</div>
		<TabTitle title="Teleport" />
	</Layout>
);
