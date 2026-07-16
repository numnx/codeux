import { createLazyFileRoute } from '@tanstack/react-router'
import SettingsChatProviderIntegrationsContent from '../content/docs/settings-chat-provider-integrations.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/settings-chat-provider-integrations')({
  component: () => (
    <DocsPage id="settings-chat-provider-integrations">
      <SettingsChatProviderIntegrationsContent />
    </DocsPage>
  )
})
