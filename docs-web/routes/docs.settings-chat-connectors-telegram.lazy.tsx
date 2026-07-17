import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsTelegramContent from '../content/docs/settings-chat-connectors-telegram.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-telegram')({
  component: () => (
    <DocsPage id="settings-chat-connectors-telegram">
      <SettingsChatConnectorsTelegramContent />
    </DocsPage>
  )
})
