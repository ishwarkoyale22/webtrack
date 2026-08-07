-- WebTrack — adds the `documents` table (metadata for uploaded invoice /
-- quotation / agreement files) to an already-set-up Supabase project.
--
-- Safe to run against a live project: it only touches the `documents`
-- table, never any of the others, so existing clients/payments/etc. data
-- is untouched.
--
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.

drop table if exists documents;
create table documents (id text primary key, doc jsonb not null);
