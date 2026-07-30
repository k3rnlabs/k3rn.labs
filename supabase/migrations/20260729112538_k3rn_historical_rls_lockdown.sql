-- K3RN historical tables are server-owned. The browser reaches them only
-- through authenticated Next.js routes, never through the Supabase Data API.
--
-- Keep this list explicit: a missing table indicates schema drift and must
-- abort the migration instead of silently leaving a data surface unprotected.

DO $$
DECLARE
  table_name TEXT;
  missing_tables TEXT[];
  protected_tables CONSTANT TEXT[] := ARRAY[
    'User',
    'ReferralLog',
    'Dossier',
    'SubFolder',
    'LabState',
    'Card',
    'CardRelation',
    'CardTransitionLog',
    'CanvasNode',
    'CanvasEdge',
    'Expert',
    'Pole',
    'Mission',
    'PoleSession',
    'ExpertSession',
    'KaelSession',
    'AutonomousMission',
    'UserNotificationSettings',
    'ScoreSnapshot',
    'ExportRecord',
    'CrowdfundingCampaign',
    'Investment',
    'AuditLog',
    'CardIngestionLog',
    'CardIngestionJob',
    'ExpertDocument',
    'Task',
    'AgentSession',
    'AgentMessage',
    '_prisma_migrations'
  ];
BEGIN
  SELECT ARRAY_AGG(name ORDER BY name)
  INTO missing_tables
  FROM UNNEST(protected_tables) AS name
  WHERE TO_REGCLASS(FORMAT('%I.%I', 'public', name)) IS NULL;

  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'K3RN_RLS_SCHEMA_DRIFT: missing tables %', missing_tables;
  END IF;

  FOREACH table_name IN ARRAY protected_tables
  LOOP
    EXECUTE FORMAT(
      'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
      'public',
      table_name
    );
    EXECUTE FORMAT(
      'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC, anon, authenticated',
      'public',
      table_name
    );
  END LOOP;
END
$$;

-- No client policy is created deliberately. service_role and the direct
-- PostgreSQL owner remain the only database-level application access paths.
