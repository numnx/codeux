import re

with open("tests/backend/server/dashboard-server.test.ts", "r") as f:
    content = f.read()

# Extract the block
match = re.search(r'(  it\("allows same-origin API requests", async \(\) => \{.*?\n  \}\);)', content, re.DOTALL)
if match:
    original_block = match.group(1)

    # Duplicate and modify the block
    new_block = original_block.replace(
        'it("allows same-origin API requests"',
        'it("rejects API requests with an untrusted host header with a 403 status"'
    )
    new_block = new_block.replace('.set("Host", "localhost:3000")', '.set("Host", "evil.com")')
    new_block = new_block.replace('expect(response.status).not.toBe(403);', 'expect(response.status).toBe(403);\n    expect(response.body).toEqual({ error: "Forbidden: Untrusted host." });')

    # Insert new block after the original block
    new_content = content.replace(original_block, f"{original_block}\n\n{new_block}")

    with open("tests/backend/server/dashboard-server.test.ts", "w") as f:
        f.write(new_content)
    print("Successfully duplicated and modified the test.")
else:
    print("Could not find the test block.")
