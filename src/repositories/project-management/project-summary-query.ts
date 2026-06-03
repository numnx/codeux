export const projectSummaryQuery = {
  select: `
      SELECT
        p.id,
        p.slug,
        p.name,
        p.base_dir,
        p.repo_url,
        p.default_branch,
        p.feature_branch_prefix,
        p.status,
        p.created_at,
        p.updated_at,
        ps.source_type,
        ps.source_ref,
        (SELECT COUNT(*) FROM sprints s WHERE s.project_id = p.id) AS sprints_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status = 'completed') AS completed_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'completed') AS open_tasks,
        (
          SELECT CASE WHEN COUNT(*) > 0 THEN 1 ELSE 0 END
          FROM sprints s
          WHERE s.project_id = p.id
            AND COALESCE(
              (
                SELECT sr.status
                FROM sprint_runs sr
                WHERE sr.sprint_id = s.id
                ORDER BY COALESCE(sr.started_at, sr.created_at) DESC, sr.created_at DESC, sr.rowid DESC
                LIMIT 1
              ),
              s.status
            ) IN ('running', 'queued')
        ) AS has_active_runs
  `,
  from: `
      FROM projects p
      LEFT JOIN project_sources ps ON ps.project_id = p.id
  `,
};
