import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "interntrac.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Get existing columns in company_profiles
    cursor.execute("PRAGMA table_info(company_profiles)")
    cols = [row[1] for row in cursor.fetchall()]

    new_cols = [
        ("msme_number", "TEXT"),
        ("contact_email", "TEXT"),
        ("contact_phone", "TEXT"),
        ("verification_decision", "TEXT"),
        ("verification_confidence", "REAL DEFAULT 0.0"),
        ("verification_risk_level", "TEXT DEFAULT 'MEDIUM'"),
        ("verification_details", "TEXT"),
        ("verified_at", "DATETIME"),
        ("reviewed_by", "TEXT"),
    ]

    for col_name, col_type in new_cols:
        if col_name not in cols:
            print(f"Adding column {col_name} to company_profiles...")
            cursor.execute(f"ALTER TABLE company_profiles ADD COLUMN {col_name} {col_type}")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")
