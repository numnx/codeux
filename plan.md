# Implementation Plan - Refactor Settings Page State (T12)

1. **Extract `useSettingsPageState` Hook**:
    - Create `dashboard/src/v2/hooks/use-settings-page-state.ts`.
    - Move types `SettingsScope`, `CategoryId`, `AgentInstructionTemplateId`, `IntegrationId`, `Category`, `IntegrationDefinition`, `CATEGORIES`, `CATEGORY_SEARCH_HINTS`, `providerLabels`, `thinkingModeOptions`, `invocationRouteDefinitions`, `routingProfileOptions`, `INTEGRATIONS`, `AGENT_INSTRUCTION_TEMPLATE_OPTIONS` from `SettingsPage.tsx` or expose them so they can be imported.
    - Extract state management (useState calls, useEffect hooks for fetching/saving/resetting settings, and calculated values like `filteredCategories`) into `useSettingsPageState` hook.
    - Return a comprehensive object exposing the state, computed values, and action handlers.

2. **Extract `SettingsCategoryRail` Component**:
    - Create `dashboard/src/v2/components/settings/SettingsCategoryRail.tsx`.
    - Accept props for `categories`, `filteredCategories`, `activeCategory`, `settingsSearch`, `onSearchChange`, `onCategoryChange`.
    - Move the sticky sidebar rendering code from `SettingsPage.tsx` into this component.

3. **Extract `SettingsContentPanels` Component**:
    - Create `dashboard/src/v2/components/settings/SettingsContentPanels.tsx`.
    - Accept props for all necessary state and handlers to render the active category's content panel.
    - Move the `renderContent`, `renderGeneralSection`, etc., and `IntegrationConfigRow`, `SectionCard` from `SettingsPage.tsx` or keep `SectionCard` in `SettingsSurface.tsx` if it's there. Actually, `SectionCard` and `IntegrationConfigRow` are defined in `SettingsPage.tsx` and should be moved or exported. We'll likely move them to `SettingsContentPanels.tsx` or export them. The requirement mentions `SettingsSurface.tsx`, maybe `SectionCard` belongs there? Let's check `SettingsSurface.tsx`.

4. **Update `SettingsSurface.tsx`**:
    - Move `SectionCard` and `IntegrationConfigRow` to `SettingsSurface.tsx` if they fit as generic layout surfaces for settings, or keep them local to panels if they are highly specific. The prompt mentions `- dashboard/src/v2/components/settings/SettingsSurface.tsx`.

5. **Refactor `SettingsPage.tsx`**:
    - Import the new hook `useSettingsPageState`.
    - Import `SettingsCategoryRail` and `SettingsContentPanels`.
    - Re-wire the component to be a thin wrapper around these extracted parts.

6. **Add Tests**:
    - Update/Create `tests/dashboard/v2/settings-page-state.test.tsx` to verify the state transitions, filtering, and hook behavior.
    - Run `npm run lint`, `npm run typecheck:dashboard`, `npm run test`, `npm run build`.

7. **Submit**:
    - Commit pre-commit steps and submit.

---

# Implementation Plan - Quicksprint Template Refactor (Merged from feature/sprint-73)

1. **Explore File & Create Sub-Component**:
   Since the Template Editor is currently inline inside `QuicksprintPanel` (approx lines 540-800), we need to extract it into a separate component called `TemplateEditor` so it can act as a "sub-component" and consume the template operations.

2. **Context Creation**:
   - At the top of `dashboard/src/v2/components/quicksprint/QuicksprintPanel.tsx`, import `createContext` and `useContext`.
   - Create and export `QuicksprintContext` with the following type:
     ```tsx
     export interface QuicksprintContextValue {
       templates: QuicksprintTemplateRecord[];
       onCreateTemplate?: (data: any) => Promise<void>;
       onUpdateTemplate?: (templateId: string, data: any) => Promise<void>;
       onDeleteTemplate?: (templateId: string) => Promise<void>;
     }
     export const QuicksprintContext = createContext<QuicksprintContextValue>({ templates: [] });
     ```

3. **Prop Definition Updates**:
   - Remove `onCreateTemplate`, `onUpdateTemplate`, and `onDeleteTemplate` from `QuicksprintPanelProps`.
   - Update `QuicksprintPanel` signature to explicitly accept these three CRUD operations to allow the parent to pass them in, but NOT pass them through to sub-components:
     ```tsx
     export const QuicksprintPanel: FunctionComponent<
       QuicksprintPanelProps & Omit<QuicksprintContextValue, "templates">
     > = ({ ...
     ```

4. **Add Context Provider**:
   - Wrap the returned JSX from `QuicksprintPanel` in `<QuicksprintContext.Provider value={{ templates, onCreateTemplate, onUpdateTemplate, onDeleteTemplate }}> ... </QuicksprintContext.Provider>`.

5. **Consume Context in Sub-components**:
   - Update `TemplateCard` to use `const { onDeleteTemplate } = useContext(QuicksprintContext)` if needed, but the prompt says "Have TemplateCard and the template editor sub-components consume template operations via useContext(QuicksprintContext) instead of receiving them as props." Wait, `TemplateCard` doesn't use `onDeleteTemplate`. Does it? No, `TemplateCard` only gets `onEdit` and `onSelect`. We will just remove `onDeleteTemplate` passing or any CRUD if it exists, but it doesn't. We'll ensure `TemplateEditor` gets them via context.
   - For `TemplateEditor`, we will pass all the state variables like `edName`, `setEdName` etc as props to the new `TemplateEditor` component, or let `TemplateEditor` manage its own state!
   - Wait, `TemplateEditor` can manage its own local state (`edName`, `edDescription`, etc)! Currently `QuicksprintPanel` manages it. If we extract `TemplateEditor`, we can also move `edName`, `setEdName`, `edDescription`, etc. into `TemplateEditor`, which cleans up `QuicksprintPanel` significantly.
   - Inside `TemplateEditor`, we will consume `const { onCreateTemplate, onUpdateTemplate, onDeleteTemplate } = useContext(QuicksprintContext);` and perform the saves and deletes.

6. **Quality Gates & Submit**:
   - Run technical quality gates: `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:coverage`, and `npm run build`.
   - Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.
   - Submit the completed task.
