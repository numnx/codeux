import re

with open('dashboard/src/v2/components/ui/__tests__/AddProjectModal.accessibility.test.tsx', 'r') as f:
    content = f.read()

if "delete confirmation state is accessible" not in content:
    new_content = content.replace('});\n', """  test("delete confirmation state is accessible", async () => {
    const { ConfirmDialog } = await import("../ConfirmDialog.js");
    const { container, rerender } = render(<ConfirmDialog isOpen={true} options={{ title: "Delete", body: "Sure?", destructive: true }} onConfirm={() => {}} onCancel={() => {}} />);

    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs[0]).toHaveAttribute("aria-labelledby", "confirm-dialog-title");
    expect(dialogs[0]).toHaveAttribute("aria-describedby", "confirm-dialog-body");

    // Check confirm button
    const confirmBtn = screen.getByRole("button", { name: /Hold to Confirm/i });
    expect(confirmBtn).toBeInTheDocument();
  });
});
""")
    with open('dashboard/src/v2/components/ui/__tests__/AddProjectModal.accessibility.test.tsx', 'w') as f:
        f.write(new_content)
