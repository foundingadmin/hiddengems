-- History is append-only (AGENTS.md, "Data and jobs"). The database enforces it, so no job, script or
-- session can rewrite or erase past prices or model outputs, even by mistake.
CREATE OR REPLACE FUNCTION hg_append_only() RETURNS trigger LANGUAGE plpgsql AS $hg$
BEGIN
  RAISE EXCEPTION '% is append-only: its rows are never updated, deleted or truncated', TG_TABLE_NAME;
END;
$hg$;
--> statement-breakpoint
CREATE TRIGGER odds_snapshots_append_only BEFORE UPDATE OR DELETE ON odds_snapshots FOR EACH ROW EXECUTE FUNCTION hg_append_only();
--> statement-breakpoint
CREATE TRIGGER odds_snapshots_no_truncate BEFORE TRUNCATE ON odds_snapshots FOR EACH STATEMENT EXECUTE FUNCTION hg_append_only();
--> statement-breakpoint
CREATE TRIGGER estimates_append_only BEFORE UPDATE OR DELETE ON estimates FOR EACH ROW EXECUTE FUNCTION hg_append_only();
--> statement-breakpoint
CREATE TRIGGER estimates_no_truncate BEFORE TRUNCATE ON estimates FOR EACH STATEMENT EXECUTE FUNCTION hg_append_only();
