import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatConnectorsWhatsappContent from '../content/docs/settings-chat-connectors-whatsapp.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-connectors-whatsapp')({
  component: () => (
    <DocsPage id="settings-chat-connectors-whatsapp">
      <SettingsChatConnectorsWhatsappContent />
    </DocsPage>
  )
})
