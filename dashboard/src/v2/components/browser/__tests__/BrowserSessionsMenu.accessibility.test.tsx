import userEvent from '@testing-library/user-event';
import { act } from '@testing-library/preact';
import { cleanup } from '@testing-library/preact';
/** @vitest-environment happy-dom */
import { render, screen, fireEvent } from '@testing-library/preact';
import { expect, test, vi, beforeEach, afterEach } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
expect.extend(matchers);
import { BrowserSessionsMenu } from '../BrowserSessionsMenu';
import { ProjectDataContext } from '../../../context/project-data.js';
import * as browserApi from '../../../lib/browser-api.js';
// Mocks

// Mock dependencies
vi.mock('../../../lib/browser-api.js', () => ({
    fetchPreviewSessions: vi.fn(),
    buildPreviewUrl: vi.fn(),
    getSafeUrl: vi.fn(),
}));

const createMockProject = () => ({
    id: 'proj-123',
    name: 'Test Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
});

vi.mock('@tanstack/react-router', () => ({
    Link: ({ children, to, className, onClick, ...props }: any) => <a href={to} className={className} onClick={onClick} {...props}>{children}</a>
}));


function TestWrapper({ children, project = createMockProject() as any }: { children: any, project?: any }) {
    return (
        <ProjectDataContext.Provider value={Object.assign({}, {
            projects: [],
            selectedProject: project,
            selectedProjectId: project?.id || null,
            loading: false,
            error: null,
            selectProject: async () => {},
            refreshProjects: async () => {},
            createProject: async () => ({}) as any,
            updateProject: async () => ({}) as any,
            deleteProject: async () => {}
        })}>
            {children}
        </ProjectDataContext.Provider>
    );
}

afterEach(() => { cleanup(); });
beforeEach(() => {
    vi.clearAllMocks();
    (browserApi.fetchPreviewSessions as any).mockResolvedValue([]);
});

test('trigger button has accessible names based on loading/empty states', async () => {
    // Loading state
    {
    render(
        <TestWrapper>
            <ProjectDataContext.Provider value={{
                projects: [],
                selectedProject: createMockProject() as any,
                selectedProjectId: createMockProject().id,
                loading: true,
                error: null,
                selectProject: async () => {},
                refreshProjects: async () => {},
                createProject: async () => ({}) as any,
                updateProject: async () => ({}) as any,
                deleteProject: async () => {}
            }}>
                <BrowserSessionsMenu />
            </ProjectDataContext.Provider>
        </TestWrapper>
    );
    let trigger = screen.getAllByRole('button')[0];
    // Mock the fetch to never resolve so loading stays true
    let resolveFetch: any;
    (browserApi.fetchPreviewSessions as any).mockReturnValue(new Promise(r => resolveFetch = r));

    // open the menu to trigger loading state
    await act(async () => { trigger.focus(); });
    await act(async () => { await new Promise(r => setTimeout(r, 0)); });

    expect(screen.getAllByRole('button')[0]).toHaveAttribute('aria-label', 'Browser Sessions: loading');

    // clean up the mock
    resolveFetch([]);
    cleanup();
    }

    // No project state
    const { unmount } = render(
        <TestWrapper project={null}>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    let trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', 'Browser Sessions: no project selected');
    unmount();

    // Default state with project
    render(
        <TestWrapper>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-label', 'Browser Sessions: 0 active sessions');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

test('trigger exposes aria-controls when open', async () => {
    render(
        <TestWrapper>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    const trigger = screen.getByRole('button');
    expect(trigger).not.toHaveAttribute('aria-controls');

    await act(async () => { fireEvent.click(trigger); });

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls');

    const menu = screen.getByRole('menu');
    expect(menu).toBeInTheDocument();
    expect(menu).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(menu).toHaveAttribute('aria-label', 'Active Browser Sessions');
});

test('keyboard navigation with ArrowUp, ArrowDown, Home, End, Escape', async () => {
    (browserApi.fetchPreviewSessions as any).mockResolvedValue([
        { id: '1', status: 'running', sprintName: 'Sprint 1', containerAppPort: 3000 },
        { id: '2', status: 'starting', sprintName: 'Sprint 2', containerAppPort: 3001 },
        { id: '3', status: 'stopped', sprintName: 'Sprint 3', containerAppPort: 3002 }
    ]);

    render(
        <TestWrapper>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    const trigger = screen.getByRole('button');
    await act(async () => { fireEvent.click(trigger); });

    // Wait for sessions to load
    const menuitems = await screen.findAllByRole('menuitem');
    expect(menuitems).toHaveLength(3);

    // Set initial focus to first item
    menuitems[0].focus();
    expect(document.activeElement).toBe(menuitems[0]);

    // ArrowDown
    await fireEvent.keyDown(menuitems[0], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuitems[1]);

    // ArrowUp
    await fireEvent.keyDown(menuitems[1], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuitems[0]);

    // End
    await fireEvent.keyDown(menuitems[0], { key: 'End' });
    expect(document.activeElement).toBe(menuitems[2]);

    // Home
    await fireEvent.keyDown(menuitems[2], { key: 'Home' });
    expect(document.activeElement).toBe(menuitems[0]);

    // Wrap around Down
    menuitems[2].focus();
    await fireEvent.keyDown(menuitems[2], { key: 'ArrowDown' });
    expect(document.activeElement).toBe(menuitems[0]);

    // Wrap around Up
    await fireEvent.keyDown(menuitems[0], { key: 'ArrowUp' });
    expect(document.activeElement).toBe(menuitems[2]);
});

test('Escape returns focus to trigger', async () => {
    // removed fake timers to avoid hanging promises
    render(
        <TestWrapper>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    const trigger = screen.getByRole('button');
    await act(async () => { trigger.focus(); });

    expect(screen.getByRole('menu')).toBeInTheDocument();

    await fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    // Run the setTimeout that returns focus
    await new Promise(r => setTimeout(r, 10));
    expect(document.activeElement).toBe(trigger);
    // removed useRealTimers
});

test('sessions expose accessible descriptions for status, sprint, and port', async () => {
    (browserApi.fetchPreviewSessions as any).mockResolvedValue([
        { id: '1', status: 'running', sprintName: 'Test Sprint', containerAppPort: 3000, hostPort: 8080 }
    ]);

    render(
        <TestWrapper>
            <BrowserSessionsMenu />
        </TestWrapper>
    );

    const trigger = screen.getByRole('button');
    await act(async () => { fireEvent.click(trigger); });

    const menuitem = await screen.findByRole('menuitem');

    // Status should have sr-only text
    expect(menuitem).toHaveTextContent('Status: running');
    expect(menuitem).toHaveTextContent('Sprint: Test Sprint');
    expect(menuitem).toHaveTextContent('Port: :3000 ➔ :8080');
    expect(menuitem).toHaveAttribute('href');
    expect(menuitem).toHaveAttribute('target', '_blank');
});
