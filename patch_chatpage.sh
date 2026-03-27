#!/bin/bash
sed -i 's/workerEndpointId: routeKind === "worker" ? option.workerEndpointId || option.connectionId || undefined,/workerEndpointId: routeKind === "worker" ? (option.workerEndpointId || option.connectionId || undefined) : undefined,/g' dashboard/src/v2/ChatPage.tsx
