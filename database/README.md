# Chainslay Database Setup

This directory contains the SQL scripts necessary to set up the MySQL database for the Chainslay application.

## Prerequisites
- MySQL Server 8.0+ running locally or remotely.

## Setup Instructions

1. Connect to your MySQL server as the `root` user or another administrative user.
   ```bash
   mysql -u root -p
   ```

2. Run the `schema.sql` script to create the database and tables.
   ```sql
   SOURCE database/schema.sql;
   ```
   Or from the command line:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. (Optional) Run the `seed.sql` script to populate the database with sample data for testing.
   ```sql
   SOURCE database/seed.sql;
   ```
   Or from the command line:
   ```bash
   mysql -u root -p < database/seed.sql
   ```

## Configuration

Make sure to create a `.env` file in the root of the project with your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=chainslay_db
```
