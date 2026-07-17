import { createLazyFileRoute } from '@tanstack/react-router'
import ArchitectureQualityAssuranceAgentContent from '../content/docs/architecture-quality-assurance-agent.mdx'
import { DocsPage } from '../components/docs/DocsPage'

export const Route = createLazyFileRoute('/docs/architecture-quality-assurance-agent')({
  component: () => (
    <DocsPage id="architecture-quality-assurance-agent">
      <ArchitectureQualityAssuranceAgentContent />
    </DocsPage>
  )
})
