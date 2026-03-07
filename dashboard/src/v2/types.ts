export type SourceStatus = 'running' | 'failed' | 'intervention' | 'idle';

export type TaskStatus = 'in_progress' | 'pending' | 'completed';

export interface Source {
    id: string;
    name: string;
    sprintsCount: number;
    openTasks: number;
    completedTasks: number;
    isRunning: boolean;
    status: SourceStatus;
    updatedAt: string;
}

export interface Task {
    id: string;
    source: string;
    sprint: string;
    title: string;
    status: TaskStatus;
    time: string;
}

export interface Sprint {
    id: string;
    name: string;
    date: string;
    tasksCount: number;
    completion: number;
}
