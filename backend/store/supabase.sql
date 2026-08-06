-- WebTrack — Supabase schema.
--
-- Run this once in your Supabase project's SQL Editor (Dashboard → SQL
-- Editor → New query → paste → Run) before setting the SUPABASE_* env vars.
--
-- One table per app collection. Each row is just { id, doc } — `doc` holds
-- the full record exactly as WebTrack's existing code already expects it
-- (_id, createdAt, updatedAt, and whatever fields that collection has), so
-- no schema migration is needed if the app's data shape changes later.
--
-- Row Level Security is intentionally left OFF: the backend talks to these
-- tables using the service_role key, which bypasses RLS anyway, and no
-- other client (browser, anon key) is ever meant to query them directly.

create table if not exists admins            (id text primary key, doc jsonb not null);
create table if not exists clients           (id text primary key, doc jsonb not null);
create table if not exists projects          (id text primary key, doc jsonb not null);
create table if not exists payments          (id text primary key, doc jsonb not null);
create table if not exists domains           (id text primary key, doc jsonb not null);
create table if not exists activities        (id text primary key, doc jsonb not null);
create table if not exists employees         (id text primary key, doc jsonb not null);
create table if not exists employee_payments (id text primary key, doc jsonb not null);
