import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsImessageContent from '../content/docs/settings-chat-connectors-imessage.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-imessage')({
  component: () => (
    <DocsPage id="settings-chat-connectors-imessage">
      <SettingsChatConnectorsImessageContent />
    </DocsPage>
  )
})
