#!/bin/bash
sed -i 's/mobileLabel="Select"/mobileLabel="Select sprint"/' dashboard/src/v2/components/sprints/SprintLedgerRow.tsx
sed -i 's/title={isSelected ? "Deselect sprint" : "Select sprint"}/title={isSelected ? `Deselect sprint ${sprint.name}` : `Select sprint ${sprint.name}`}/' dashboard/src/v2/components/sprints/SprintLedgerRow.tsx
sed -i 's/aria-label={isSelected ? "Deselect sprint" : "Select sprint"}/aria-label={isSelected ? `Deselect sprint ${sprint.name}` : `Select sprint ${sprint.name}`}/' dashboard/src/v2/components/sprints/SprintLedgerRow.tsx
sed -i 's/title={sprint.showcasePinned ? "Remove from showcase" : "Pin to showcase"}/title={sprint.showcasePinned ? `Remove sprint ${sprint.name} from showcase` : `Pin sprint ${sprint.name} to showcase`}/' dashboard/src/v2/components/sprints/SprintLedgerRow.tsx
sed -i 's/aria-label={sprint.showcasePinned ? `Remove sprint ${sprint.name} from showcase` : `Pin sprint ${sprint.name} to showcase`}/aria-label={sprint.showcasePinned ? `Remove sprint ${sprint.name} from showcase` : `Pin sprint ${sprint.name} to showcase`}/' dashboard/src/v2/components/sprints/SprintLedgerRow.tsx
