#!/bin/bash
sed -i 's/screen.getByText("Replay Required")/screen.getAllByText("Replay Required")[0]/g' tests/dashboard/v2/chat-thread-header.test.tsx
