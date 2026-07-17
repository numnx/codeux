import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsDiscordContent from '../content/docs/settings-chat-connectors-discord.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-discord')({
  component: () => (
    <DocsPage id="settings-chat-connectors-discord">
      <SettingsChatConnectorsDiscordContent />
    </DocsPage>
  )
})
