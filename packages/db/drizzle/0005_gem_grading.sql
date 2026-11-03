CREATE TABLE "gem_records" (
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
	"kind" text NOT NULL,
	"rating" integer,
	"hit_chance" double precision NOT NULL,
	"clarity" integer NOT NULL,
	"carat" double precision NOT NULL,
	"decision_slot" text,
	"decision_at" timestamp with time zone NOT NULL,
	"decision_price" double precision NOT NULL,
	"decision_priced" double precision NOT NULL,
	"decision_fair" double precision NOT NULL,
	"freeze_at" timestamp with time zone NOT NULL,
	"freeze_price" double precision NOT NULL,
	"freeze_priced" double precision NOT NULL,
	"freeze_fair" double precision NOT NULL,
	"is_new" boolean NOT NULL,
	"new_reason" text,
	"estimate_id" bigint,
	"model" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"subject" text NOT NULL,
	"gem_record_id" bigint,
	"bet_id" text,
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"taken" double precision NOT NULL,
	"close_price" double precision NOT NULL,
	"close_fair" double precision NOT NULL,
	"clv" double precision NOT NULL,
	"beat_close" boolean NOT NULL,
	"hit" boolean NOT NULL,
	"touchdowns" smallint NOT NULL,
	"box" text NOT NULL,
	"graded_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gem_records" ADD CONSTRAINT "gem_records_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem_records" ADD CONSTRAINT "gem_records_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem_records" ADD CONSTRAINT "gem_records_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem_records" ADD CONSTRAINT "gem_records_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gem_records" ADD CONSTRAINT "gem_records_estimate_id_estimates_id_fk" FOREIGN KEY ("estimate_id") REFERENCES "public"."estimates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_gem_record_id_gem_records_id_fk" FOREIGN KEY ("gem_record_id") REFERENCES "public"."gem_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gem_records_game_id_selection_key_index" ON "gem_records" USING btree ("game_id","selection_key");--> statement-breakpoint
CREATE INDEX "gem_records_kind_index" ON "gem_records" USING btree ("kind");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_gem_record_id_index" ON "grades" USING btree ("gem_record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "grades_bet_id_index" ON "grades" USING btree ("bet_id");--> statement-breakpoint
CREATE INDEX "grades_game_id_index" ON "grades" USING btree ("game_id");--> statement-breakpoint
-- Gem records are history like odds_snapshots and estimates (migration 0003): never updated, deleted or truncated.
CREATE TRIGGER gem_records_append_only BEFORE UPDATE OR DELETE ON gem_records FOR EACH ROW EXECUTE FUNCTION hg_append_only();
--> statement-breakpoint
CREATE TRIGGER gem_records_no_truncate BEFORE TRUNCATE ON gem_records FOR EACH STATEMENT EXECUTE FUNCTION hg_append_only();