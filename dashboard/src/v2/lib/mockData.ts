export const mockStats = {
    dailyTokens: 1450000,
    weeklyTokens: 8200000,
    successRate: 98.4,
    failedJobs: 12,
    completedJobs: 738,
    modelDist: {
        gemini: 65,
        claude: 25,
        gpt4: 10,
    }
};

// Mock Data for Sources
export const mockSources = [
    { id: "src-1", name: "auth-service", sprintsCount: 2, openTasks: 5, completedTasks: 12, isRunning: true, updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: "src-2", name: "payment-gateway", sprintsCount: 0, openTasks: 0, completedTasks: 8, isRunning: false, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: "src-3", name: "user-dashboard", sprintsCount: 1, openTasks: 3, completedTasks: 4, isRunning: true, updatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "src-4", name: "jules-cli", sprintsCount: 3, openTasks: 10, completedTasks: 45, isRunning: true, updatedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString() },
    { id: "src-5", name: "email-templates", sprintsCount: 0, openTasks: 0, completedTasks: 1, isRunning: false, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString() },
    { id: "src-6", name: "data-pipeline", sprintsCount: 1, openTasks: 2, completedTasks: 9, isRunning: false, updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

export const mockTasks = [
    { id: 'tsk-001', source: 'jules-agent-mcp', sprint: 'Sprint 4', title: 'Implement V2 Dashboard base layout', status: 'Running', time: '1h 20m' },
    { id: 'tsk-002', source: 'jules-agent-mcp', sprint: 'Sprint 4', title: 'Route Legacy App', status: 'Done', time: '12m' },
    { id: 'tsk-003', source: 'payment-gateway', sprint: 'Sprint 12', title: 'Stripe webhook integration', status: 'Queued', time: '--' },
    { id: 'tsk-004', source: 'mobile-app-react-native', sprint: 'Sprint 5', title: 'Fix navigation lag on Android', status: 'Running', time: '45m' },
    { id: 'tsk-005', source: 'dashboard-v2-proto', sprint: 'Sprint 1', title: 'GSAP Animation for Header', status: 'Queued', time: '--' },
];
