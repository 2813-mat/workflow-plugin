---
name: db-schema
description: 'Get the current database schema snapshot for any API in apps/api. MUST be invoked before modifying, analyzing, or creating entities/migrations for any API in apps/api/. Examples: "/db-schema catalog", "/db-schema payouts", "what tables exist in platform?"'
---

# db-schema — Database Schema Snapshot

**Invoke this skill before modifying or analyzing any module inside `apps/api/{name}`** — it gives you the live schema instead of forcing you to read dozens of migration files.

## When to Invoke

- Anytime you explore entities, migrations, or data models inside `apps/api/{name}`
- Before creating a new migration (to know current column names, types, and constraints)
- When asked "what columns does table X have?" or "does this field exist?"
- Before writing queries or TypeORM entity code

## Step 1 — Detect Connected Databases from `main.ts`

**Do not guess or use naming conventions.** Read the bootstrap file to know exactly which DBs the API uses:

```
apps/api/{name}/src/main.ts
```

Look for the `apiModule.bootstrap([...])` call and trace each argument back to its import. Example:

```typescript
import { connect as catalogConnect } from '@incentive-me/database-catalog'   // → DB: catalog
import { MySQLConnector as LegacyMySQLConnector } from '@incentive-me/database-legacy' // → DB: legacy
import { MongooseConnection } from './db'  // → MongoDB — IGNORE

apiModule.bootstrap([
  catalogConnect,                          // MySQL: catalog
  () => new LegacyMySQLConnector().connect(), // MySQL: legacy
  MongooseConnection.connect,              // MongoDB: skip
])
```

### Identification rules

| Import source | Action |
|---|---|
| `@incentive-me/database-{name}` | MySQL DB named `{name}` — query it |
| `@incentive-me/database-legacy` | MySQL legacy DB — see credentials below |
| Local path (`./db`, `./mongo`, etc.) resolving to Mongoose/MongoDB | **Skip** |

### Credentials by DB type

**General MySQL** (all `@incentive-me/database-*` except legacy):
- Host: `127.0.0.1` | Port: `30000` | User: `root` | Password: `mysqlroot`
- DB name = last segment of the package (e.g., `database-catalog` → `catalog`)

**Legacy MySQL** (`@incentive-me/database-legacy`):
- **Do NOT connect to MySQL.** Read TypeORM models instead — see Step 2b.

## Step 2a — Query the Live Database (general MySQL DBs only)

Run once per non-legacy DB detected in Step 1.

```bash
mysql -h 127.0.0.1 -P 30000 -u root -pmysqlroot \
  --table \
  -e "SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLUMN_KEY, IS_NULLABLE, EXTRA \
      FROM information_schema.COLUMNS \
      WHERE TABLE_SCHEMA = '{db_name}' \
      ORDER BY TABLE_NAME, ORDINAL_POSITION;" \
  information_schema
```

## Step 2b — Read TypeORM Models (legacy DB only)

The legacy schema lives in TypeORM entity files. Do not query MySQL for it.

1. Read `libs/database/legacy/src/models.ts` — it re-exports every entity
2. For each exported entity, read `libs/database/legacy/src/lib/{EntityName}.ts`
3. Extract table name (`@Entity('table_name')`), column names, types, and decorators (`@PrimaryGeneratedColumn`, `@Column`, `@ManyToOne`, etc.)
4. Treat `@ManyToOne` / `@OneToMany` / `@JoinColumn` decorators as the FK relationship definition

Present the legacy schema in the same compact format as the live-query output (see Output Format below), labeled as `[legacy] Table: {Name}`.

### Reading the Output

| `COLUMN_KEY` | Meaning |
|---|---|
| `PRI` | Primary key |
| `UNI` | Unique constraint |
| `MUL` | Foreign key or non-unique index |
| _(empty)_ | Plain column |

## Step 3 — Fallback (DB not available)

If MySQL is unreachable, reconstruct the schema from migrations:

```
libs/database/{target}/mysql/migrations/
```

1. Read the **first file** (`00001-*.sql`) — it is a full `mysqldump --no-data` with all `CREATE TABLE` statements.
2. Read only subsequent files that contain `ALTER TABLE`, `CREATE TABLE`, or `DROP TABLE` — apply them mentally in order.
3. Skip files that only contain `INSERT` (lookup/seed data).

## Foreign Key Naming Convention

This project does **not** use explicit FK constraints in most tables. Relationships are encoded in column names. Apply these rules when reading any schema:

### `*Id` suffix
A column named `{Entity}Id` points to `{Entity}.id`:
- `userId` → `User.id`
- `storeId` → `Store.id`
- `awardId` → `Award.id`
- `integrationId` → `Integration.id`
- `organizationId` → `Organization.id`

### `*Uuid` suffix
The same rule applies when the FK is a UUID:
- `userUuid` → `User.uuid`
- `budgetUuid` → `Budget.uuid`
- `paymentUuid` → `Payment.uuid`

### Rule
> For any column `{X}Id` or `{X}Uuid`, there is a table `{X}` with a column `id` or `uuid` respectively. This is the join condition — even when no FK constraint is listed in the schema.

## Output Format

After running the query, present the schema grouped by table in this compact format:

```
Table: Award
  id            int unsigned   PRI  NOT NULL  AUTO_INCREMENT
  name          varchar(255)         NOT NULL
  integrationId int unsigned   MUL  NULL
  created       datetime             NOT NULL  DEFAULT CURRENT_TIMESTAMP
  modified      datetime             NULL      ON UPDATE CURRENT_TIMESTAMP
```

List all tables alphabetically. Do not omit any table — even junction/lookup tables are relevant.
