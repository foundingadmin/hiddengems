CREATE TABLE "player_usage" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"season" smallint NOT NULL,
	"week" smallint NOT NULL,
	"team_id" text NOT NULL,
	"position" text NOT NULL,
	"snap_pct" double precision,
	"rz_carries" smallint DEFAULT 0 NOT NULL,
	"rz_targets" smallint DEFAULT 0 NOT NULL,
	"rz_carry_tds" smallint DEFAULT 0 NOT NULL,
	"rz_target_tds" smallint DEFAULT 0 NOT NULL,
	"touchdowns" smallint DEFAULT 0 NOT NULL,
	"run_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "player_usage_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "spread_line" double precision;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "total_line" double precision;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "injury_status" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "injury_week" smallint;--> statement-breakpoint
ALTER TABLE "player_usage" ADD CONSTRAINT "player_usage_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_usage" ADD CONSTRAINT "player_usage_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_usage" ADD CONSTRAINT "player_usage_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_usage_season_index" ON "player_usage" USING btree ("season");