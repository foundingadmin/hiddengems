CREATE TABLE "slip_legs" (
	"slip_id" text NOT NULL,
	"selection_key" text NOT NULL,
	"game_id" text NOT NULL,
	"market_id" text NOT NULL,
	"player_id" text,
	"player_name" text,
	"side" text NOT NULL,
	"line" double precision,
	"book_id" text NOT NULL,
	"price_decimal" double precision NOT NULL,
	"added_at" timestamp with time zone NOT NULL,
	"bet_id" text,
	CONSTRAINT "slip_legs_slip_id_selection_key_pk" PRIMARY KEY("slip_id","selection_key")
);
--> statement-breakpoint
CREATE TABLE "slips" (
	"id" text PRIMARY KEY NOT NULL,
	"season" smallint NOT NULL,
	"week" smallint NOT NULL,
	"state" text DEFAULT 'draft' NOT NULL,
	"play" text DEFAULT 'own' NOT NULL,
	"book_id" text DEFAULT 'draftkings' NOT NULL,
	"stake" numeric(10, 2),
	"appraisal" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone,
	"placed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_slip_id_slips_id_fk" FOREIGN KEY ("slip_id") REFERENCES "public"."slips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slip_legs" ADD CONSTRAINT "slip_legs_bet_id_bets_id_fk" FOREIGN KEY ("bet_id") REFERENCES "public"."bets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slips" ADD CONSTRAINT "slips_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "slip_legs_bet_id_index" ON "slip_legs" USING btree ("bet_id");--> statement-breakpoint
CREATE INDEX "slips_season_week_index" ON "slips" USING btree ("season","week");