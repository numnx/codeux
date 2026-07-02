import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { fetchProjectInvocations } from "../../../lib/invocation-api.js";
import type { ExecutionInvocationRecord, ProjectInvocationsQuery, ProjectInvocationsQueryResult } from "../../../types.js";


import {
  SystemFilters,
  SystemSort,
  SystemSummaryMetrics,
  ExternalApiMetrics,
  SprintStateSummary,
  ErrorsByCategory,
  EMPTY_FILTERS,
  computeLegacyFilteredInvocations,
  computeLegacySummaryMetrics,
  computeLegacyAvailablePurposes,
  computeLegacyAvailableProviders,
  computeLegacyExternalApiMetrics,
  computeLegacyErrorsByCategory,
  computeLegacySprintStateSummary,
} from "../system-view-models.js";

// Re-export interface shapes if needed by SystemStudio
export type { SystemSortKey, SystemSort, SystemFilters, ExternalApiMetrics, SprintStateSummary, ErrorsByCategory, SystemSummaryMetrics } from "../system-view-models.js";

/**
 * Stats system view hook.
 * This is a server-projected analytics surface. It trusts the server-side
 * `ProjectInvocationsQueryResult.summary`, available filters, and paginated items.
 * Legacy client-side processing is only kept as a fallback for older mocks.
 */
export function useSystemViewData(projectId: string) {
  const [legacyAllInvocations, setLegacyAllInvocations] = useState<ExecutionInvocationRecord[] | null>(null);
  const [serverResult, setServerResult] = useState<ProjectInvocationsQueryResult | null>(null);
  const [filters, setFilters] = useState<SystemFilters>(EMPTY_FILTERS);
  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<SystemSort>({ key: "startedAt", dir: "desc" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 100;

  useEffect(() => {
    setPage(0);
  }, [filters, search, sort]);

  useEffect(() => {
    if (!projectId) {
      setLegacyAllInvocations(null);
      setServerResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();

    const query: ProjectInvocationsQuery = {
      limit: pageSize,
      offset: page * pageSize,
      search: search || undefined,
      sortKey: ["startedAt", "durationMs", "totalTokens", "costCents"].includes(sort.key) ? (sort.key as any) : undefined,
      sortDir: sort.dir,
      status: filters.status.length > 0 ? filters.status[0] : undefined,
      purpose: filters.purpose.length > 0 ? filters.purpose[0] : undefined,
      provider: filters.provider.length > 0 ? filters.provider[0] : undefined,
      errorCategories: filters.errorCategories && filters.errorCategories.length > 0 ? filters.errorCategories : undefined,
    };

    void fetchProjectInvocations(projectId, query, { signal: controller.signal })
      .then((response: ExecutionInvocationRecord[] | ProjectInvocationsQueryResult) => {
        if (Array.isArray(response)) {
          setLegacyAllInvocations(response);
          setServerResult(null);
        } else {
          setLegacyAllInvocations(null);
          setServerResult(response);
        }
        setLoading(false);
      })
      .catch((fetchError: unknown) => {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }
        setError(fetchError instanceof Error ? fetchError.message : String(fetchError));
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [projectId, refreshKey, page, search, sort, filters]);

  const filteredInvocations = useMemo(() => {
    if (serverResult !== null) {
      return serverResult.items;
    }
    return legacyAllInvocations ? computeLegacyFilteredInvocations(legacyAllInvocations, filters, search, sort) : [];
  }, [legacyAllInvocations, serverResult, filters, search, sort]);

  const summaryMetrics = useMemo<SystemSummaryMetrics>(() => {
    if (serverResult?.summary) {
      const sum = serverResult.summary;
      const decidedCount = sum.completedCount + sum.failedCount + sum.cancelledCount;
      const cacheDenominator = sum.totalInputTokens + sum.totalCachedTokens;
      return {
        ...sum,
        errorRate: sum.failedCount / Math.max(1, sum.totalInvocations),
        successRate: decidedCount > 0 ? sum.completedCount / decidedCount : null,
        cacheHitRate: cacheDenominator > 0 ? sum.totalCachedTokens / cacheDenominator : null,
      };
    }
    return computeLegacySummaryMetrics(filteredInvocations);
  }, [filteredInvocations, serverResult]);

  const availablePurposes = useMemo(() => {
    if (serverResult?.availablePurposes) return serverResult.availablePurposes;
    return legacyAllInvocations ? computeLegacyAvailablePurposes(legacyAllInvocations) : [];
  }, [legacyAllInvocations, serverResult]);

  const externalApiMetrics = useMemo<ExternalApiMetrics>(() => {
    if (serverResult?.summary?.externalApiMetrics) return serverResult.summary.externalApiMetrics;
    return legacyAllInvocations ? computeLegacyExternalApiMetrics(legacyAllInvocations) : { git: { calls: 0, avgDurationMs: 0 }, jules: { calls: 0, avgDurationMs: 0 }, jira: { calls: 0, avgDurationMs: 0 }, other: { calls: 0, avgDurationMs: 0 } };
  }, [legacyAllInvocations, serverResult]);

  const sprintStateSummary = useMemo<SprintStateSummary>(() => {
    if (serverResult?.summary?.sprintStateSummary) return serverResult.summary.sprintStateSummary;
    return legacyAllInvocations ? computeLegacySprintStateSummary(legacyAllInvocations) : { totalSprints: 0, activeSprints: 0, completedSprints: 0, failedSprints: 0, totalTasks: 0, runningTasks: 0, blockedTasks: 0 };
  }, [legacyAllInvocations, serverResult]);

  const errorsByCategory = useMemo<ErrorsByCategory>(() => {
    if (serverResult?.summary?.errorsByCategory) return serverResult.summary.errorsByCategory;
    return legacyAllInvocations ? computeLegacyErrorsByCategory(legacyAllInvocations) : { timeout: 0, rateLimit: 0, apiError: 0, modelError: 0, cancelled: 0, other: 0 };
  }, [legacyAllInvocations, serverResult]);

  const availableProviders = useMemo(() => {
    if (serverResult?.availableProviders) return serverResult.availableProviders;
    return legacyAllInvocations ? computeLegacyAvailableProviders(legacyAllInvocations) : [];
  }, [legacyAllInvocations, serverResult]);

  const refetch = useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  const hasMore = serverResult !== null ? (page * pageSize + serverResult.items.length < serverResult.totalCount) : false;
  const totalCount = serverResult !== null ? serverResult.totalCount : (legacyAllInvocations?.length || 0);

  return {
    invocations: filteredInvocations,
    summaryMetrics,
    availablePurposes,
    availableProviders,
    filters,
    setFilters,
    search,
    setSearch,
    sort,
    setSort,
    loading,
    error,
    refetch,
    externalApiMetrics,
    sprintStateSummary,
    errorsByCategory,
    page,
    setPage,
    hasMore,
    totalCount,
  };
}
