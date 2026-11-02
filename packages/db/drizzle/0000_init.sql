CREATE TABLE "bets" (
	"id" text PRIMARY KEY NOT NULL,
	"placed_at" timestamp with time zone NOT NULL,
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"book_id" text NOT NULL,
	"price_decimal" double precision NOT NULL,
	"stake" numeric(10, 2) NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"payout" numeric(10, 2),
	"closing_price" double precision,
	"settled_at" timestamp with time zone,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "estimates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"probability" double precision NOT NULL,
	"model" text NOT NULL,
	"inputs" jsonb,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"season" smallint NOT NULL,
	"season_type" text DEFAULT 'reg' NOT NULL,
	"week" smallint,
	"kickoff_at" timestamp with time zone NOT NULL,
	"away_team_id" text NOT NULL,
	"home_team_id" text NOT NULL,
	"neutral_site" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"away_score" smallint,
	"home_score" smallint,
	"odds_pulled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_locks" (
	"job" text PRIMARY KEY NOT NULL,
	"holder" text,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"scope" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "odds_latest" (
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"book_id" text NOT NULL,
	"price_decimal" double precision NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"pulled_at" timestamp with time zone NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	CONSTRAINT "odds_latest_selection_key_book_id_pk" PRIMARY KEY("selection_key","book_id")
);
--> statement-breakpoint
CREATE TABLE "odds_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"book_id" text NOT NULL,
	"price_decimal" double precision NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"pulled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "picks" (
	"selection_key" text PRIMARY KEY NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"best_book_id" text NOT NULL,
	"best_price" double precision NOT NULL,
	"priced" double precision NOT NULL,
	"estimate" double precision NOT NULL,
	"model" text NOT NULL,
	"gap_pts" integer NOT NULL,
	"tier" text,
	"signals" jsonb NOT NULL,
	"verdict" text NOT NULL,
	"run_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_game_stats" (
	"game_id" text NOT NULL,
	"player_id" text NOT NULL,
	"touchdowns" smallint DEFAULT 0 NOT NULL,
	"receptions" smallint,
	"receiving_yards" smallint,
	"rushing_yards" smallint,
	"passing_yards" smallint,
	"passing_tds" smallint,
	"extra" jsonb,
	"run_id" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "player_game_stats_game_id_player_id_pk" PRIMARY KEY("game_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"position" text,
	"team_id" text,
	"jersey_number" smallint,
	"status" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_refs" (
	"provider" text NOT NULL,
	"entity" text NOT NULL,
	"external_id" text NOT NULL,
	"internal_id" text NOT NULL,
	CONSTRAINT "provider_refs_provider_entity_external_id_pk" PRIMARY KEY("provider","entity","external_id")
);
--> statement-breakpoint
CREATE TABLE "provider_usage" (
	"provider" text PRIMARY KEY NOT NULL,
	"used" integer,
	"remaining" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job" text NOT NULL,
	"provider" text,
	"trigger" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"failure_owner" text,
	"error_code" text,
	"message" text,
	"request_count" integer DEFAULT 0 NOT NULL,
	"rows_written" integer DEFAULT 0 NOT NULL,
	"meta" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"duration_ms" integer
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"abbr" text NOT NULL,
	"city" text NOT NULL,
	"name" text NOT NULL,
	"conference" text NOT NULL,
	"division" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bets" ADD CONSTRAINT "bets_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "games" ADD CONSTRAINT "games_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_latest" ADD CONSTRAINT "odds_latest_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_latest" ADD CONSTRAINT "odds_latest_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_latest" ADD CONSTRAINT "odds_latest_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_latest" ADD CONSTRAINT "odds_latest_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "odds_snapshots" ADD CONSTRAINT "odds_snapshots_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "picks" ADD CONSTRAINT "picks_best_book_id_books_id_fk" FOREIGN KEY ("best_book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_game_stats" ADD CONSTRAINT "player_game_stats_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_logs" ADD CONSTRAINT "run_logs_run_id_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bets_placed_at_index" ON "bets" USING btree ("placed_at");--> statement-breakpoint
CREATE INDEX "bets_status_index" ON "bets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "estimates_selection_key_computed_at_index" ON "estimates" USING btree ("selection_key","computed_at");--> statement-breakpoint
CREATE INDEX "games_kickoff_at_index" ON "games" USING btree ("kickoff_at");--> statement-breakpoint
CREATE INDEX "games_season_week_index" ON "games" USING btree ("season","week");--> statement-breakpoint
CREATE INDEX "odds_latest_game_id_index" ON "odds_latest" USING btree ("game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "odds_snapshots_selection_key_book_id_observed_at_index" ON "odds_snapshots" USING btree ("selection_key","book_id","observed_at");--> statement-breakpoint
CREATE INDEX "odds_snapshots_selection_key_observed_at_index" ON "odds_snapshots" USING btree ("selection_key","observed_at");--> statement-breakpoint
CREATE INDEX "odds_snapshots_game_id_index" ON "odds_snapshots" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "picks_gap_pts_index" ON "picks" USING btree ("gap_pts");--> statement-breakpoint
CREATE INDEX "picks_game_id_index" ON "picks" USING btree ("game_id");--> statement-breakpoint
CREATE INDEX "players_name_key_index" ON "players" USING btree ("name_key");--> statement-breakpoint
CREATE INDEX "players_team_id_index" ON "players" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "provider_refs_entity_internal_id_index" ON "provider_refs" USING btree ("entity","internal_id");--> statement-breakpoint
CREATE INDEX "run_logs_run_id_index" ON "run_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "runs_job_started_at_index" ON "runs" USING btree ("job","started_at");--> statement-breakpoint
CREATE INDEX "runs_started_at_index" ON "runs" USING btree ("started_at");