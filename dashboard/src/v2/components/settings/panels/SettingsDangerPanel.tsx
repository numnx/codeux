import type { FunctionComponent, ComponentChildren } from "preact";
import type { SettingsPageState } from "../../../hooks/use-settings-page-state.js";
import { ActionButton } from "../SettingsSurface.js";
import { Row } from "../SettingsFormFields.js";
import { SectionCard } from "./SharedPanelComponents.js";
import { useConfirmDialog } from "../../../hooks/use-confirm-dialog.js";
import { ConfirmDialog } from "../../ui/ConfirmDialog.js";

export const SettingsDangerPanel: FunctionComponent<{ state: SettingsPageState }> = ({ state }) => {
  const {
    activeScope,
    selectedProject,
    deletingProject,
    resettingDatabase,
    handleDeleteProject,
    handleResetDatabase,
  } = state;

  const { isOpen, options, requestConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  return (
    <div className="flex flex-col gap-5">
      <ConfirmDialog isOpen={isOpen} options={options} onConfirm={handleConfirm} onCancel={handleCancel} />
      <SectionCard title="Danger Zone" watermark="DGR" danger>
        <Row label="Reset project database" description="Permanently delete all tasks, sprints, and context history." last>
          <ActionButton
            label="Wipe Project"
            onClick={() => void handleDeleteProject(requestConfirm)}
            tone="danger"
            busy={deletingProject}
            disabled={!selectedProject}
          />
        </Row>
      </SectionCard>
      {activeScope === "system" ? (
        <SectionCard title="System Database" watermark="SYS" danger>
          <Row label="Hard reset database" description="Delete all projects, tasks, sprints, and system history. This will cleanly reconstruct the local DB on the next reload." last>
            <ActionButton
              label="Wipe Database"
              onClick={() => void handleResetDatabase(requestConfirm)}
              tone="danger"
              busy={resettingDatabase}
            />
          </Row>
        </SectionCard>
      ) : null}
    </div>
  );
};
