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
-- The DROP statements make this safe to re-run — e.g. if an earlier,
-- different schema attempt already created these table names with the
-- wrong columns, this replaces them cleanly.
--
-- Row Level Security is intentionally left OFF: the backend talks to these
-- tables using the service_role key, which bypasses RLS anyway, and no
-- other client (browser, anon key) is ever meant to query them directly.

drop table if exists admins;
drop table if exists clients;
drop table if exists projects;
drop table if exists payments;
drop table if exists domains;
drop table if exists activities;
drop table if exists employees;
drop table if exists employee_payments;

create table admins            (id text primary key, doc jsonb not null);
create table clients           (id text primary key, doc jsonb not null);
create table projects          (id text primary key, doc jsonb not null);
create table payments          (id text primary key, doc jsonb not null);
create table domains           (id text primary key, doc jsonb not null);
create table activities        (id text primary key, doc jsonb not null);
create table employees         (id text primary key, doc jsonb not null);
create table employee_payments (id text primary key, doc jsonb not null);
