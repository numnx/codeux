/** @vitest-environment happy-dom */
import { h, Fragment } from "preact";
/** @jsx h */
/** @jsxFrag Fragment */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/preact';
import { UsageFilterMenu } from "../../../../../dashboard/src/v2/pages/stats/components/UsageFilterMenu.js";

describe('UsageFilterMenu', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    activeWindow: '7d',
    customFrom: '2026-04-20',
    customTo: '2026-04-27',
    onSelectPreset: vi.fn(),
    onCustomFromChange: vi.fn(),
    onCustomToChange: vi.fn(),
    onApplyCustom: vi.fn(),
    stats: {
      chartSeries: [
        { id: 'tokens', label: 'Tokens', color: '#00E0A0', defaultEnabled: true },
        { id: 'active', label: 'Active Time', color: '#FFB800', defaultEnabled: true }
      ]
    } as any,
    enabledSeries: { tokens: true, active: true },
    setEnabledSeries: vi.fn()
  };

  it('should render when open', () => {
    const { getByText } = render(<UsageFilterMenu {...mockProps} />);
    expect(getByText('Graph Filters')).toBeTruthy();
    expect(getByText('Time Window')).toBeTruthy();
    expect(getByText('Metric Series')).toBeTruthy();
  });

  it('should call onClose when close button is clicked', () => {
    const { getAllByRole } = render(<UsageFilterMenu {...mockProps} />);
    // The close button is the one with the X icon, usually the first or only one in the header
    const buttons = getAllByRole('button');
    const closeButton = buttons.find(b => b.querySelector('svg.lucide-x'));
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should call onSelectPreset when a preset button is clicked', () => {
    const { getAllByText } = render(<UsageFilterMenu {...mockProps} />);
    const presetButtons = getAllByText('24h');
    fireEvent.click(presetButtons[0]!);
    expect(mockProps.onSelectPreset).toHaveBeenCalledWith('24h');
  });

  it('should call onApplyCustom when apply button is clicked', () => {
    const { getAllByText } = render(<UsageFilterMenu {...mockProps} />);
    const applyButtons = getAllByText('Apply Range');
    fireEvent.click(applyButtons[0]!);
    expect(mockProps.onApplyCustom).toHaveBeenCalled();
  });

  it('should call setEnabledSeries when a metric button is clicked', () => {
    const { getAllByText } = render(<UsageFilterMenu {...mockProps} />);
    const metricLabels = getAllByText('Tokens');
    const metricButton = metricLabels[0]!.closest('button');
    fireEvent.click(metricButton!);
    // It should call setEnabledSeries because tokens is currently enabled and there are 2 enabled series
    expect(mockProps.setEnabledSeries).toHaveBeenCalled();
  });

  it('should not allow disabling the last enabled series', () => {
    const singleSeriesProps = {
      ...mockProps,
      enabledSeries: { tokens: true, active: false }
    };
    const { getAllByText } = render(<UsageFilterMenu {...singleSeriesProps} />);
    const metricLabels = getAllByText('Tokens');
    const tokensButton = metricLabels[0]!.closest('button');
    expect(tokensButton?.disabled).toBe(true);
    fireEvent.click(tokensButton!);
    expect(mockProps.setEnabledSeries).not.toHaveBeenCalled();
  });
});

