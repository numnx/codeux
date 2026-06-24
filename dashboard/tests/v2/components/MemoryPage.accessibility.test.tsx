/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/preact';

import { MemoryFilters } from '../../../src/v2/components/memory/MemoryFilters.js';
import { MemoryList } from '../../../src/v2/components/memory/MemoryList.js';
import { MemoryCard } from '../../../src/v2/components/memory/MemoryCard.js';
import { Inspector } from '../../../src/v2/components/memory/Inspector.js';
import { activeMemoryIdSignal } from '../../../src/v2/components/memory/memoryState.js';

vi.mock('../../../src/v2/lib/memory-api.js', () => ({
    getMemoryStats: vi.fn().mockResolvedValue({ sprint: 2, agent: 1, project: 3, activeModel: 'test-model' }),
    listEmbeddingModels: vi.fn().mockResolvedValue([{ id: 'test-model', name: 'Test Model', sizeBytes: 1000 }]),
    getEmbeddingMap: vi.fn().mockResolvedValue({ nodes: [], edges: [] }),
    deleteMemory: vi.fn().mockResolvedValue({})
}));

describe('Memory Components Accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));
    });

    afterEach(() => {
        cleanup();
        activeMemoryIdSignal.value = undefined;
    });

    it('has accessible memory tiers tablist in MemoryFilters', async () => {
        render(
            <MemoryFilters
                stats={{ sprint: 1, agent: 1, project: 1, activeModel: null }}
                sprints={[]}
                agentPresets={[]}
                showModels={false}
                setShowModels={vi.fn()}
                setShowAddModal={vi.fn()}
                lobotomize={false}
                handleLobotomizeToggle={vi.fn()}
            />
        );
        expect(screen.getByRole('tablist', { name: 'Memory tiers' })).toBeInTheDocument();
        const tabs = screen.getAllByRole('tab');
        expect(tabs.length).toBeGreaterThan(0);

        const firstTab = tabs[0];
        firstTab.focus();
        expect(document.activeElement).toBe(firstTab);
        fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
        await waitFor(() => {
            expect(document.activeElement).toBe(tabs[1]);
        });
    });

    it('announces result count in an aria-live region in MemoryList', () => {
        const nodes = [
            { id: '1', content: 'Test Memory 1', category: 'architecture', strength: 0.8, alive: true } as any
        ];
        render(<MemoryList nodes={nodes} onSelectNode={vi.fn()} />);

        const liveRegion = screen.getByText(/memories found/i);
        expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    });

    it('allows keyboard interaction on MemoryCard and shows selected state', async () => {
        const onClick = vi.fn();
        render(
            <MemoryCard
                id="1"
                content="Test content"
                category="architecture"
                strength={0.8}
                onClick={onClick}
            />
        );

        const card = screen.getByRole('option');
        expect(card).toHaveAttribute('aria-selected', 'false');

        fireEvent.keyDown(card, { key: 'Enter' });
        expect(onClick).toHaveBeenCalled();

        activeMemoryIdSignal.value = "1";

        await waitFor(() => {
            expect(card).toHaveAttribute('aria-selected', 'true');
            expect(screen.getByText('Selected')).toBeInTheDocument();
            expect(screen.getByText('Selected')).toHaveAttribute('aria-hidden', 'true');
        });
    });

    it('manages Inspector region accessibility correctly', () => {
        const node = { id: '1', content: 'Test', category: 'architecture', strength: 0.8, alive: true } as any;
        const { rerender } = render(
            <Inspector
                node={null}
                allNodes={[]}
                edges={[]}
                lobotomize={false}
                onClose={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        // the region name query doesn't work when display/visibility is hidden depending on jsdom/happydom limitations.
        // We can just query by role and check aria-hidden and aria-label
        const inspector = screen.getByRole('region', { hidden: true });
        expect(inspector).toHaveAttribute('aria-label', 'Memory Details');
        expect(inspector).toHaveAttribute('aria-hidden', 'true');

        rerender(
            <Inspector
                node={node}
                allNodes={[node]}
                edges={[]}
                lobotomize={false}
                onClose={vi.fn()}
                onDelete={vi.fn()}
            />
        );

        expect(inspector).toHaveAttribute('aria-hidden', 'false');
        expect(screen.getByRole('button', { name: 'Close memory details' })).toBeInTheDocument();
    });
});
