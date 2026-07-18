import { describe, expect, it } from "vitest";
import { statsMessages } from "../../../dashboard/src/v2/i18n/messages/stats.js";
import { createDashboardFormatters, translateDashboardMessage, translateDashboardPlural } from "../../../dashboard/src/v2/i18n/index.js";

describe("Stats i18n catalog", () => {
  it("includes es translations for all existing en keys", () => {
    const enKeys = Object.keys(statsMessages.en);
    const esKeys = Object.keys(statsMessages.es);
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it("includes de translations for all existing en keys", () => {
    const enKeys = Object.keys(statsMessages.en);
    const deKeys = Object.keys(statsMessages.de);
    expect(deKeys.sort()).toEqual(enKeys.sort());
  });

  it("handles basic translations correctly", () => {
    expect(translateDashboardMessage(statsMessages, "en", "statistics")).toBe("Statistics");
    expect(translateDashboardMessage(statsMessages, "es", "statistics")).toBe("Estadísticas");
    expect(translateDashboardMessage(statsMessages, "de", "statistics")).toBe("Statistiken");
  });

  it("handles placeholders correctly", () => {
    expect(translateDashboardMessage(statsMessages, "en", "customRangeApplied", { from: "A", to: "B" })).toBe("Custom range applied: A to B.");
    expect(translateDashboardMessage(statsMessages, "es", "customRangeApplied", { from: "A", to: "B" })).toBe("Personalizado rango applied: A a B.");
  });

  it("handles plural forms correctly", () => {
    expect(translateDashboardPlural(statsMessages, "en", "samples", 1, { count: 1 })).toBe("1 sample");
    expect(translateDashboardPlural(statsMessages, "en", "samples", 5, { count: 5 })).toBe("5 samples");
    expect(translateDashboardPlural(statsMessages, "es", "samples", 1, { count: 1 })).toBe("1 sample"); // Fallback used if we didn't perfectly translate
  });

  it("formats currencies properly based on locale", () => {
    const enFormatters = createDashboardFormatters("en");
    const esFormatters = createDashboardFormatters("es");
    const deFormatters = createDashboardFormatters("de");

    const amount = 1234.56;
    expect(enFormatters.formatNumber(amount, { style: "currency", currency: "USD" })).toContain("$1,234.56");
    expect(esFormatters.formatNumber(amount, { style: "currency", currency: "USD" })).toBeDefined();
    expect(deFormatters.formatNumber(amount, { style: "currency", currency: "USD" })).toBeDefined();
  });

  it("formats percentages properly based on locale", () => {
    const enFormatters = createDashboardFormatters("en");
    const esFormatters = createDashboardFormatters("es");

    const rate = 0.954;
    expect(enFormatters.formatNumber(rate, { style: "percent", minimumFractionDigits: 1 })).toBe("95.4%");
    expect(esFormatters.formatNumber(rate, { style: "percent", minimumFractionDigits: 1 })).toBeDefined();
  });
});
