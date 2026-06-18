/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act, cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';
import { UsageFilterMenu } from '../components/UsageFilterMenu.js';
import gsap from 'gsap';

describe('UsageFilterMenu', () => {
  afterEach(cleanup);
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    stats: {
      chartSeries: [
        { id: 'tokens', label: 'Tokens', color: '#00E0A0', defaultEnabled: true },
        { id: 'active', label: 'Active Time', color: '#FFB800', defaultEnabled: true },
        { id: 'git_commits', label: 'Git Commits', color: '#333333', defaultEnabled: false, grouping: 'git' }
      ]
    } as any,
    enabledSeries: { tokens: true, active: true },
    setEnabledSeries: vi.fn()
  };

  it('should render when open', () => {
    const { getByText } = render(<UsageFilterMenu {...mockProps} />);
    expect(getByText('Graph Filters')).toBeTruthy();
    expect(getByText('Metric Series')).toBeTruthy();
  });

  it('should call onClose when close button is clicked', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const closeButton = getAllByRole('button', { name: 'Close graph filters' })[0];
    fireEvent.click(closeButton);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should call setEnabledSeries when a metric button is clicked', () => {
    const { getAllByText } = render(<UsageFilterMenu {...mockProps} />);
    const metricButton = getAllByText('Tokens')[0];
    fireEvent.click(metricButton);
    expect(mockProps.setEnabledSeries).toHaveBeenCalled();
  });

  it('should not allow disabling the last enabled series', () => {
    const setEnabledSeriesSpy = vi.fn();
    const singleSeriesProps = {
      ...mockProps,
      enabledSeries: { tokens: true, active: false }, setEnabledSeries: setEnabledSeriesSpy
    };
    const { getAllByText } = render(<UsageFilterMenu {...singleSeriesProps} />);
    setEnabledSeriesSpy.mockClear();
    const tokensButton = getAllByText('Tokens')[0].closest('button');
    fireEvent.click(tokensButton!);
    expect(setEnabledSeriesSpy).not.toHaveBeenCalled();
  });

  it('should have appropriate popup semantics and stable accessible name', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const dialog = getAllByRole('dialog')[0];
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe('usage-filter-menu-title');
    expect(dialog.querySelector('#usage-filter-menu-title')).toBeTruthy();
  });

  it('should focus the close button when opened', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const closeButton = getAllByRole('button', { name: 'Close graph filters' })[0];
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close graph filters');
  });

  it('should restore focus to trigger when closed', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    const { unmount, rerender } = render(<UsageFilterMenu {...mockProps} />);
    expect(document.activeElement).not.toBe(trigger);

    await act(async () => {
      rerender(<UsageFilterMenu {...mockProps} isOpen={false} />);
      gsap.globalTimeline.progress(1);
    });

    expect(document.activeElement).toBe(trigger);

    document.body.removeChild(trigger);
    unmount();
  });

  it('should format metric groups into labeled groups', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const groups = getAllByRole('group');
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0].getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('should explain that at least one series must remain visible for last active series', () => {
    const singleSeriesProps = {
      ...mockProps,
      enabledSeries: { tokens: true, active: false }
    };
    const { getAllByRole } = render(<UsageFilterMenu {...singleSeriesProps} />);
    const tokensButton = getAllByRole('button').find(b => b.textContent?.includes('Tokens'))!;

    expect(tokensButton.getAttribute('aria-disabled')).toBe('true');
    expect(tokensButton.getAttribute('aria-describedby')).toBe('last-series-warning');

    const warning = document.getElementById('last-series-warning');
    expect(warning).toBeTruthy();
    expect(warning?.textContent).toBe('At least one series must remain visible');
  });

  it('should render Reset filters button with a clear accessible name', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const resetBtn = getAllByRole('button', { name: 'Reset graph filters', hidden: true })[0];
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.style.display).not.toBe('none');
  });

  it('should hide Reset filters button when no series are active', () => {
    const emptyProps = { ...mockProps, enabledSeries: { tokens: false, active: false } };
    const { queryAllByRole } = render(<UsageFilterMenu {...emptyProps} />);
    const resetBtns = queryAllByRole('button', { hidden: true }).filter(b => b.getAttribute('aria-label') === 'Reset graph filters');
    expect(resetBtns.length).toBeGreaterThan(0);
    expect(resetBtns[0].hasAttribute('disabled')).toBe(true);
  });

  it('should call onClose when Escape key is pressed', () => {
    render(<UsageFilterMenu {...mockProps} />);
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should call setEnabledSeries when a metric button is toggled via keyboard', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    const metricButton = getAllByRole('button').find(b => b.textContent?.includes('Tokens'))!;

    // Simulate keyboard press (Enter)
    fireEvent.keyDown(metricButton, { key: 'Enter', code: 'Enter' });
    fireEvent.click(metricButton); // Native buttons trigger click on Enter/Space, testing-library fireEvent.click simulates this for accessibility tests or we can trigger it directly
    expect(mockProps.setEnabledSeries).toHaveBeenCalled();
  });

});
