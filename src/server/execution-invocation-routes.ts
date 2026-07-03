import type { Express } from "express";
import type { DashboardDependencies } from "./dashboard-server.js";
import { syncRoute } from "./route-utils.js";
import { requireTrimmedString } from "./request-parsers.js";

import type { ProjectInvocationsQuery } from "../contracts/invocation-types.js";

export function registerExecutionInvocationRoutes(router: Express, deps: DashboardDependencies): void {
  router.get("/api/projects/:projectId/execution/invocations", syncRoute((req, res) => {
    const projectId = requireTrimmedString(req.params.projectId, "projectId");

    if (Object.keys(req.query).length > 0 && deps.executionRepository) {
            const query: ProjectInvocationsQuery = {
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
        status: Array.isArray(req.query.status) ? (req.query.status as any) : req.query.status as any,
        purpose: Array.isArray(req.query.purpose) ? (req.query.purpose as any) : req.query.purpose as any,
        provider: Array.isArray(req.query.provider) ? (req.query.provider as any) : req.query.provider as string,
        search: req.query.search as string,
        sortKey: req.query.sortKey as any,
        sortDir: req.query.sortDir as any,
        errorCategories: Array.isArray(req.query.errorCategories)
          ? (req.query.errorCategories as string[])
          : typeof req.query.errorCategories === 'string'
            ? [req.query.errorCategories]
            : undefined,
      };
      res.json(deps.executionRepository.queryProjectInvocations({ ...query, projectId }));
      return;
    }

    res.json(deps.listProjectInvocations(projectId));
  }));

  router.get("/api/execution/invocations/:invocationId/messages", syncRoute((req, res) => {
    const invocationId = requireTrimmedString(req.params.invocationId, "invocationId");

    if (req.query.limit !== undefined || req.query.offset !== undefined) {
      const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const parsedOffset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;
      const limit = parsedLimit !== undefined && !isNaN(parsedLimit) ? Math.min(parsedLimit, 1000) : undefined;
      const offset = parsedOffset !== undefined && !isNaN(parsedOffset) ? Math.max(0, parsedOffset) : undefined;

      res.json(deps.listInvocationMessages(invocationId, { limit, offset }));
      return;
    }

    res.json(deps.listInvocationMessages(invocationId));
  }));
}
