# 🐘 PostgreSQL Quick Reference

## 🚀 Quick Deploy to Render

```bash
# 1. Commit all changes
git add .
git commit -m "Add PostgreSQL support with database migrations"
git push origin main

# 2. Wait for Render to deploy (2-3 minutes)

# 3. In Render Dashboard → Shell tab
flask db upgrade

# 4. Done! ✅
```

---

## 📝 Common Migration Commands

```bash
# Create migration after model changes
flask db migrate -m "Description"

# Apply migrations
flask db upgrade

# Rollback last migration
flask db downgrade

# View migration history
flask db history

# Check current version
flask db current
```

---

## 🔍 Database Commands

### **Check PostgreSQL on Render**
```bash
# In Render Shell
flask db current              # Current migration
psql $DATABASE_URL -c '\dt'   # List tables
psql $DATABASE_URL -c 'SELECT COUNT(*) FROM meetings;'
```

### **Check SQLite Locally**
```bash
sqlite3 instance/noteflow.db
.tables
SELECT COUNT(*) FROM meetings;
.quit
```

---

## ✅ What Changed

| File | Change |
|------|--------|
| `requirements.txt` | Added `psycopg2-binary`, `flask-migrate` |
| `config.py` | Auto-detect PostgreSQL vs SQLite |
| `app.py` | Added Flask-Migrate initialization |
| `migrations/` | Database migration files (NEW) |

---

## 🎯 How It Works

**Locally:** Uses SQLite (no setup needed)
**Render:** Uses PostgreSQL (automatic)

The app **auto-detects** the environment!

---

## 🐛 Troubleshooting

| Error | Fix |
|-------|-----|
| "relation does not exist" | Run `flask db upgrade` |
| "psycopg2 not found" | Run `pip install psycopg2-binary` |
| "No changes detected" | Normal if models unchanged |

---

## 📚 Full Documentation

See **POSTGRESQL_SETUP.md** for complete guide!
