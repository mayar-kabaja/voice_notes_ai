# 🐘 PostgreSQL Setup Guide

Your NoteFlow AI app now supports **PostgreSQL** for production use on Render!

---

## 🎯 What Changed

### **Before:**
- SQLite only (single file database)
- Not scalable
- Limited concurrent users
- File-based storage

### **After:**
- ✅ **PostgreSQL** on Render (production)
- ✅ **SQLite** for local development
- ✅ **Database migrations** with Flask-Migrate
- ✅ **Automatic detection** of environment
- ✅ **Better performance** and scalability

---

## 🚀 Deployment (Render)

### **Step 1: Render Automatically Provides PostgreSQL**

When you deploy to Render:
1. Render creates a **PostgreSQL database** automatically
2. Sets the `DATABASE_URL` environment variable
3. Your app **automatically connects** to PostgreSQL

**You don't need to do anything!** It just works! ✨

### **Step 2: Deploy Your Code**

```bash
git add .
git commit -m "Add PostgreSQL support with Flask-Migrate"
git push origin main
```

### **Step 3: Run Migrations on Render**

After deploying, Render will automatically:
- Install dependencies (`psycopg2-binary`, `flask-migrate`)
- Connect to PostgreSQL
- But you need to run migrations ONCE

**In Render Dashboard:**

1. Go to **Shell** tab
2. Run:
   ```bash
   flask db upgrade
   ```

That's it! Your database is now PostgreSQL on Render! 🎉

---

## 💻 Local Development (SQLite)

For local development, continue using SQLite (no PostgreSQL installation needed):

### **Option 1: Keep Using SQLite (Recommended for Dev)**

Just run the app as usual:
```bash
python app.py
```

The app automatically uses SQLite locally.

### **Option 2: Use PostgreSQL Locally (Advanced)**

If you want to test with PostgreSQL locally:

#### **Install PostgreSQL**

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Linux:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo service postgresql start
```

**Windows:**
Download from: https://www.postgresql.org/download/windows/

#### **Create Local Database**

```bash
# Create database
createdb noteflow_dev

# Set environment variable
export DATABASE_URL="postgresql://localhost/noteflow_dev"

# Run migrations
flask db upgrade

# Start app
python app.py
```

---

## 🔄 Database Migrations

### **What are Migrations?**

Migrations track changes to your database schema (like version control for your database).

### **Common Migration Commands**

#### **Create a new migration** (after changing models):
```bash
flask db migrate -m "Description of changes"
```

#### **Apply migrations** (update database):
```bash
flask db upgrade
```

#### **Rollback migrations** (undo last change):
```bash
flask db downgrade
```

#### **View migration history**:
```bash
flask db history
```

#### **Check current migration**:
```bash
flask db current
```

---

## 📊 Example: Adding a New Field

Let's say you want to add a `language` field to videos:

### **Step 1: Update the model**

Edit `models/meeting.py`:
```python
class Video(db.Model):
    # ... existing fields ...
    language = db.Column(db.String(10), nullable=True)  # NEW FIELD
```

### **Step 2: Create migration**

```bash
flask db migrate -m "Add language field to Video model"
```

This creates a migration file in `migrations/versions/`

### **Step 3: Apply migration**

**Locally:**
```bash
flask db upgrade
```

**On Render:**
Go to Shell tab and run:
```bash
flask db upgrade
```

Done! The field is now in the database! ✅

---

## 🗂️ Migration Files

Migrations are stored in:
```
migrations/
  ├── versions/
  │   └── xxxx_initial_migration.py
  ├── alembic.ini
  ├── env.py
  └── script.py.mako
```

**Important:**
- ✅ **Commit these files** to git
- ✅ **Don't manually edit** migration files
- ✅ **Always test migrations** before deploying

---

## 🔍 Checking Your Database

### **On Render:**

1. **View PostgreSQL details:**
   - Go to Dashboard → Your Service
   - Click "Connect" → "External Connection"
   - See connection details

2. **Connect via psql:**
   ```bash
   psql postgresql://user:pass@host:port/database
   ```

3. **View tables:**
   ```sql
   \dt
   ```

4. **View data:**
   ```sql
   SELECT * FROM meetings LIMIT 10;
   SELECT * FROM books LIMIT 10;
   SELECT * FROM videos LIMIT 10;
   ```

### **Locally (SQLite):**

```bash
# Open SQLite database
sqlite3 instance/noteflow.db

# View tables
.tables

# View data
SELECT * FROM meetings LIMIT 10;

# Exit
.quit
```

---

## 🎛️ Configuration Details

### **How It Works**

The app automatically detects the environment:

```python
# In config.py
database_url = os.environ.get('DATABASE_URL')

if database_url:
    # Production (Render) - Use PostgreSQL
    SQLALCHEMY_DATABASE_URI = database_url
else:
    # Local Development - Use SQLite
    SQLALCHEMY_DATABASE_URI = 'sqlite:///noteflow.db'
```

### **Environment Variables**

**Render sets automatically:**
- `DATABASE_URL` - PostgreSQL connection string

**Optional local variables:**
```bash
# .env file
DATABASE_URL=postgresql://localhost/noteflow_dev  # Use local PostgreSQL
# Or leave blank to use SQLite
```

---

## 🛠️ Troubleshooting

### **Issue: "relation does not exist"**

**Cause:** Tables not created in PostgreSQL

**Fix:**
```bash
flask db upgrade
```

---

### **Issue: "No changes in schema detected"**

**Cause:** Models haven't changed

**Fix:** Only create migrations when you change models

---

### **Issue: "psycopg2 import error"**

**Cause:** PostgreSQL driver not installed

**Fix:**
```bash
pip install psycopg2-binary
```

---

### **Issue: "Database connection failed"**

**Cause:** Wrong DATABASE_URL

**Fix:** Check Render Dashboard for correct connection string

---

## 📊 Performance Benefits

### **PostgreSQL vs SQLite:**

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| **Concurrent Users** | Limited | Unlimited |
| **Performance** | Good for small | Excellent |
| **Scalability** | Poor | Excellent |
| **Data Integrity** | Basic | Advanced |
| **Backup** | Manual | Automatic |
| **Cloud Ready** | No | Yes ✅ |

---

## 🔐 Backup & Recovery

### **Render Automatic Backups**

Render automatically backs up your PostgreSQL database:
- Daily automatic backups
- 7-day retention
- Point-in-time recovery

### **Manual Backup**

```bash
# Export database
pg_dump postgresql://user:pass@host:port/database > backup.sql

# Restore database
psql postgresql://user:pass@host:port/database < backup.sql
```

---

## 📈 Monitoring

### **View Database Stats on Render:**

1. Go to Dashboard → Your Service
2. Click on "Postgres" (linked database)
3. View:
   - Storage used
   - Connections
   - Query performance
   - Slow queries

---

## ✅ Checklist

Before deploying:

- [x] Added PostgreSQL dependencies
- [x] Updated config.py
- [x] Initialized Flask-Migrate
- [x] Created migrations folder
- [x] Tested locally
- [ ] Committed migrations to git
- [ ] Deployed to Render
- [ ] Run `flask db upgrade` on Render
- [ ] Verified tables exist
- [ ] Tested the app

---

## 🎉 Benefits

With PostgreSQL, you now have:

- ✅ **Production-ready database**
- ✅ **Automatic backups**
- ✅ **Better performance**
- ✅ **Unlimited scalability**
- ✅ **Database migrations**
- ✅ **Multi-user support**
- ✅ **Data integrity**

---

## 🚀 Quick Deploy

```bash
# 1. Commit changes
git add .
git commit -m "Add PostgreSQL support"
git push origin main

# 2. Wait for Render to deploy

# 3. Run migrations in Render Shell
flask db upgrade

# 4. Done! 🎉
```

---

## 📚 Resources

- [Flask-Migrate Docs](https://flask-migrate.readthedocs.io/)
- [Alembic Docs](https://alembic.sqlalchemy.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Render PostgreSQL Guide](https://render.com/docs/databases)

---

**Your database is now production-ready!** 🐘✨
