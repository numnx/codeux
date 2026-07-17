import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsOverviewContent from '../content/docs/settings-chat-connectors-overview.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-overview')({
  component: () => (
    <DocsPage id="settings-chat-connectors-overview">
      <SettingsChatConnectorsOverviewContent />
    </DocsPage>
  )
})
