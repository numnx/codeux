import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsSlackContent from '../content/docs/settings-chat-connectors-slack.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-slack')({
  component: () => (
    <DocsPage id="settings-chat-connectors-slack">
      <SettingsChatConnectorsSlackContent />
    </DocsPage>
  )
})
