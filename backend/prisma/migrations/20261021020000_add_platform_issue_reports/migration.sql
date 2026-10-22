BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public."PlatformIssueReports" (
    "id" bigserial NOT NULL,
    "reporter_id" bigint NOT NULL,
    "title" varchar(150) NOT NULL,
    "category" varchar(50) NOT NULL,
    "description" varchar(5000) NOT NULL,
    "created_at" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlatformIssueReports_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "platform_issue_reports_title_check" CHECK (char_length(trim("title")) > 0),
    CONSTRAINT "platform_issue_reports_category_check" CHECK (char_length(trim("category")) > 0),
    CONSTRAINT "platform_issue_reports_description_check" CHECK (char_length(trim("description")) > 0),
    CONSTRAINT "PlatformIssueReports_reporter_id_fkey" FOREIGN KEY ("reporter_id")
        REFERENCES public."Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "platform_issue_reports_reporter_created_at_index"
    ON public."PlatformIssueReports" ("reporter_id", "created_at" DESC);
CREATE INDEX "platform_issue_reports_created_at_index"
    ON public."PlatformIssueReports" ("created_at" DESC);

-- Reports are submitted through the authenticated backend, not direct browser queries.
ALTER TABLE public."PlatformIssueReports" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."PlatformIssueReports" FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public."PlatformIssueReports_id_seq" FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public."PlatformIssueReports" TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public."PlatformIssueReports_id_seq" TO service_role;

COMMIT;
