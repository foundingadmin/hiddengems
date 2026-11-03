CREATE TABLE "gem_marks" (
	"selection_key" text PRIMARY KEY NOT NULL,
	"found_at" timestamp with time zone NOT NULL,
	"found_rating" integer NOT NULL,
	"read_at" timestamp with time zone,
	"read_rating" integer
);
