CREATE TABLE "provider_caps" (
	"provider" text PRIMARY KEY NOT NULL,
	"monthly_cents" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
