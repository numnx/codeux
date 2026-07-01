with open('dashboard/src/v2/components/sprints/SprintActionMenu.tsx', 'r') as f:
    content = f.read()

# Make sure we restore focus for close events.
# We will do this by wrapping `onClose` calls with focus logic where appropriate.
# However, usually DropdownMenu components handle focus on escape.
# The user wants explicitly: "Update Action Menu in SprintActionMenu.tsx: Ensure action menu items expose clear destructive/non-destructive affordances, keyboard navigation, and focus restoration after menu close."

# Focus restoration for action menu is done in SprintLedgerRow.tsx
# In SprintLedgerRow.tsx, the trigger is the MoreVertical button.
