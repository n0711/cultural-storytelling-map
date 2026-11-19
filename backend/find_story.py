"""Inspect local story records without creating or modifying a database."""

import sqlite3
from contextlib import closing
from pathlib import Path

DATABASE = Path(__file__).resolve().parent / "storymap.db"


def main() -> None:
    # SQLite's read-only URI prevents a missing database from being created.
    with closing(sqlite3.connect(f"{DATABASE.as_uri()}?mode=ro", uri=True)) as conn:
        conn.row_factory = sqlite3.Row
        for row in conn.execute("SELECT id, title, image_url, status FROM stories"):
            print(dict(row))


if __name__ == "__main__":
    main()
