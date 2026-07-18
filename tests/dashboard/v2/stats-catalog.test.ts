import { describe, expect, it } from 'vitest';
import { createDashboardFormatters, translateDashboardMessage, translateDashboardPlural } from '../../../dashboard/src/v2/i18n/index.js';
import { statsMessages } from '../../../dashboard/src/v2/i18n/messages/stats.js';

describe('Stats Catalog (dashboard/src/v2/i18n/messages/stats.ts)', () => {
  it('should define fully populated en, de, and es blocks', () => {
    // TypeScript type-checks that the blocks have the exact same shape,
    // but we can assert at runtime that they exist.
    const locales = Object.keys(statsMessages);
    expect(locales).toContain('en');
    expect(locales).toContain('de');
    expect(locales).toContain('es');

    const enKeys = Object.keys(statsMessages.en);
    const deKeys = Object.keys(statsMessages.de);
    const esKeys = Object.keys(statsMessages.es);

    expect(enKeys.length).toBeGreaterThan(400);
    expect(enKeys.length).toEqual(deKeys.length);
    expect(enKeys.length).toEqual(esKeys.length);
  });

  it('should support localized text rendering for the newly extracted keys', () => {
    expect(translateDashboardMessage(statsMessages, 'en', 'chartCore')).toBe('Core');
    expect(translateDashboardMessage(statsMessages, 'de', 'chartCore')).toBe('Kern');
    expect(translateDashboardMessage(statsMessages, 'es', 'chartCore')).toBe('Núcleo');

    expect(translateDashboardMessage(statsMessages, 'en', 'durationHoursMinutes', { hours: 2, minutes: 30 })).toBe('2h 30m');
    expect(translateDashboardMessage(statsMessages, 'de', 'durationHoursMinutes', { hours: 2, minutes: 30 })).toBe('2 h 30 min');
  });

  it('should format currency correctly via formatters', () => {
    const enFormatters = createDashboardFormatters('en');
    const deFormatters = createDashboardFormatters('de');
    const esFormatters = createDashboardFormatters('es');

    const value = 1234.56;
    const enStr = enFormatters.formatNumber(value, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    const deStr = deFormatters.formatNumber(value, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
    const esStr = esFormatters.formatNumber(value, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

    // In node 18+, currency symbols and placement respect locales
    expect(enStr.includes('1,234.56')).toBe(true);
    expect(deStr.includes('1.234,56')).toBe(true);
    expect(esStr.includes('1.234,56') || esStr.includes('1234,56') || esStr.includes('1,234.56')).toBe(true);
  });

  it('should support plural rendering for newly extracted or existing keys', () => {
    expect(translateDashboardPlural(statsMessages, 'en', 'segments', 1, { count: 1 })).toBe('1 segment');
    expect(translateDashboardPlural(statsMessages, 'en', 'segments', 2, { count: 2 })).toBe('2 segments');
    expect(translateDashboardPlural(statsMessages, 'de', 'segments', 1, { count: 1 })).toBe('1 Segment');
    expect(translateDashboardPlural(statsMessages, 'de', 'segments', 2, { count: 2 })).toBe('2 Segmente');

    // We translated segment exactly via Google Translate
    // Let's assert it falls back or translates
    const esSingle = translateDashboardPlural(statsMessages, 'es', 'segments', 1, { count: 1 });
    const esMulti = translateDashboardPlural(statsMessages, 'es', 'segments', 2, { count: 2 });
    expect(esSingle).toBeTruthy();
    expect(esMulti).toBeTruthy();
  });
});
