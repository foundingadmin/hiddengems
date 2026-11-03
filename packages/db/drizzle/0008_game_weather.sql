CREATE TABLE "game_weather" (
	"game_id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"forecast_at" timestamp with time zone NOT NULL,
	"temperature_f" double precision,
	"wind_mph" double precision,
	"gust_mph" double precision,
	"precip_chance" smallint,
	"precip_in" double precision,
	"snow_in" double precision,
	"weather_code" smallint,
	"run_id" text NOT NULL,
	"pulled_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "game_weather" ADD CONSTRAINT "game_weather_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;