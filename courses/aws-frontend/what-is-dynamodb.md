---
title: What is DynamoDB?
description: >-
  Understand what DynamoDB is, how it differs from relational databases, and why
  it is a practical choice for frontend engineers who need a lightweight data
  layer.
date: 2026-03-18
modified: 2026-03-18
tags:
  - aws
  - dynamodb
  - databases
  - fundamentals
---

You do not need PostgreSQL for a todo list. You do not need to learn SQL joins, manage connection pools, or pay for a database server that runs 24/7 whether or not anyone is using your app. If your frontend needs a place to store and retrieve data — user preferences, form submissions, a list of items — **DynamoDB** gives you a database without giving you a database server.

DynamoDB is a fully managed, serverless NoSQL database from AWS. You create a table, write data to it, read data from it, and AWS handles everything else: provisioning, replication, patching, backups, scaling. If that sounds familiar, it should — it is the same "you write the code, we run the infrastructure" model you saw with Lambda in [What is Lambda?](what-is-lambda.md).

## How It Differs from SQL Databases

If you have used PostgreSQL, MySQL, or even SQLite in a side project, you are accustomed to the relational model: tables with rigid schemas, rows and columns, and SQL queries that can join across multiple tables. That model is powerful, but it comes with operational overhead that frontend engineers rarely need.

DynamoDB uses a **key-value and document model** instead. Here is how the two compare:

|                       | Relational Database (PostgreSQL)                     | DynamoDB                                           |
| --------------------- | ---------------------------------------------------- | -------------------------------------------------- |
| Schema                | Fixed columns, defined up front                      | Flexible — each item can have different attributes |
| Query language        | SQL                                                  | API calls (SDK or CLI)                             |
| Joins                 | Yes, across multiple tables                          | No joins — design around single-table access       |
| Scaling               | You manage (replicas, read/write scaling)            | Automatic and on-demand                            |
| Server                | You provision and maintain it                        | Fully managed, no server                           |
| Connection management | Connection pools, max connections                    | HTTP API — no persistent connections               |
| Pricing               | Per hour (the server runs whether you use it or not) | Per request (you pay for what you use)             |

The mental shift: with a relational database, you design your schema around your data and then figure out queries. With DynamoDB, you design your schema around your **access patterns** — the specific ways your application reads and writes data. For a frontend API backend, your access patterns are usually simple: "get this item by ID," "list items for this user," "create a new item," "delete this item." DynamoDB handles these patterns well.

## The Data Model

DynamoDB organizes data into **tables**. Each table contains **items** (think rows), and each item contains **attributes** (think columns). But unlike a relational database, items in the same table do not need to have the same attributes. One item might have `title`, `status`, and `priority`. Another item in the same table might have `title` and `dueDate` but no `priority`. The only attributes that every item must have are the ones that make up the table's **primary key**.

Here is what an item looks like:

```json
{
  "userId": "user-123",
  "itemId": "item-456",
  "title": "Deploy to production",
  "status": "in-progress",
  "createdAt": "2026-03-18T10:00:00Z"
}
```

This is just a JSON object. There is no schema migration, no `ALTER TABLE`, no ORM. If you want to add a `priority` field next week, you just start including it in new items. Existing items are unaffected.

> [!TIP]
> If you have used Firebase's Firestore or MongoDB, DynamoDB's data model will feel familiar. The key difference is how you query it — DynamoDB does not have the flexible query language that Firestore or MongoDB offers. You trade query flexibility for predictable performance at any scale.

## Why Serverless and Managed Matters

DynamoDB is serverless in the same way Lambda is serverless: there is no instance to provision, no operating system to patch, no disk to resize. You interact with it through API calls — PutItem, GetItem, Query, Scan — and AWS handles the physical infrastructure.

For frontend engineers, this matters because:

- **No connection management.** Unlike PostgreSQL, which requires persistent connections and connection pooling (a common pain point in serverless architectures), DynamoDB uses HTTP-based API calls. Your Lambda function makes a request, gets a response, and moves on. No connection limits, no connection timeouts, no "too many connections" errors.
- **No cold start penalty for the database.** Lambda has cold starts. DynamoDB does not. Your table is always ready to accept requests.
- **No server to keep running.** A PostgreSQL instance on RDS costs money every hour, even at 3 AM when nobody is using your app. DynamoDB with on-demand pricing charges you per request. Zero requests, zero cost.

## On-Demand Pricing

DynamoDB offers two pricing modes: **provisioned** and **on-demand**. For a frontend API backend, on-demand is almost always the right choice. You do not need to predict traffic or configure capacity units.

<!-- VERIFY: pricing updated November 2024, confirm still current -->

With on-demand pricing in `us-east-1`:

- **Read requests**: $0.125 per million read request units
- **Write requests**: $0.625 per million write request units
- **Storage**: $0.25 per GB per month (first 25 GB free)

For context: if your frontend app serves 10,000 users per month and each user makes 50 read requests and 10 write requests, that is 500,000 reads and 100,000 writes per month. At on-demand pricing, that costs about $0.06 for reads and $0.06 for writes. Twelve cents a month for your entire data layer.

> [!WARNING]
> The DynamoDB free tier includes 25 GB of storage and enough read/write capacity for most development workloads. But the free tier only applies to tables using **provisioned** capacity mode, not on-demand. For learning and development, the cost difference is negligible — on-demand with low traffic will cost pennies. But be aware of this distinction if you are trying to stay strictly within the free tier.

## When DynamoDB Is the Right Choice

DynamoDB is a good fit when:

- Your access patterns are simple and well-defined (get by key, list by partition, create, update, delete)
- You want zero operational overhead
- Your data does not require complex joins or aggregations
- You are building a serverless application with Lambda

DynamoDB is not a good fit when:

- You need complex queries with joins across multiple tables
- You need full-text search (use OpenSearch for that)
- Your data model is deeply relational and requires referential integrity
- You need SQL-compatible analytics across your entire dataset

For the typical frontend API backend — storing user data, tracking application state, persisting form submissions — DynamoDB handles the job with less complexity and lower cost than a relational database.

## What is Next

You know what DynamoDB is and why it fits into a serverless frontend architecture. In the next lesson, you will create your first DynamoDB table, choose a primary key, and understand how key design drives everything else about how you use the table.
