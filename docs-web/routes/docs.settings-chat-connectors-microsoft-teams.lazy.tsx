import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsMicrosoftTeamsContent from '../content/docs/settings-chat-connectors-microsoft-teams.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-microsoft-teams')({
  component: () => (
    <DocsPage id="settings-chat-connectors-microsoft-teams">
      <SettingsChatConnectorsMicrosoftTeamsContent />
    </DocsPage>
  )
})
