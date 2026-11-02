---
title: One data lake for operational data spread across many sources
summary: Operational data lived in databases, CSV exports and APIs, and reporting depended on preparing it by hand. I built a data lake and ETL pipeline on AWS so business teams get consistent reports without the manual work.
context: Company centralizing its operational data
area: Data engineering
order: 1
stack:
  - Amazon S3
  - AWS Glue with PySpark
  - AWS Lambda and EventBridge
  - Glue Data Catalog and Athena
  - Amazon QuickSight
  - Amazon CloudWatch
diagram: data-lake
---

## The situation

The company's operational data was spread across relational databases, CSV exports and REST APIs. Reporting depended on people pulling that data together and preparing it by hand, which was slow and made it hard to keep numbers consistent from one report to the next.

## What I built

- **Ingestion.** Data from the relational databases, CSV exports and REST APIs lands in Amazon S3 automatically, with Lambda and EventBridge running and scheduling the ingestion.
- **Processing.** AWS Glue jobs written in PySpark cleanse, validate and deduplicate the raw data and apply the business transformations. The curated datasets are written back to S3 in Parquet.
- **Catalog and queries.** The Glue Data Catalog holds the schemas and metadata, so the curated data can be queried in SQL with Athena.
- **Reporting.** Dashboards and reports in Amazon QuickSight, built on the curated datasets rather than raw exports.
- **Monitoring.** CloudWatch tracks the pipeline and surfaces errors, so a failed load gets noticed and fixed.

## Outcome

- A central data platform instead of data scattered across systems.
- Data preparation automated end to end, with no manual processing before a report.
- Better data quality, because validation and deduplication happen before data reaches anyone's dashboard.
- Business teams work from the same curated data, so their reports are consistent.
