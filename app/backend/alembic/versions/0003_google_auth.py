"""Google sign-in: authors get a Google identity; devices link to authors.

Revision ID: 0003
Revises: 0002
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("authors", sa.Column("google_sub", sa.String(64)))
    op.add_column("authors", sa.Column("email", sa.String(320)))
    op.add_column("authors", sa.Column("picture_url", sa.String(512)))
    op.create_unique_constraint("uq_authors_google_sub", "authors", ["google_sub"])
    op.alter_column("authors", "device_hash", nullable=True)

    # One author (a Google account) can sign in from many devices.
    op.create_table(
        "author_devices",
        sa.Column("device_hash", sa.String(64), primary_key=True),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("authors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_author_devices_author", "author_devices", ["author_id"])
    # Existing anonymous profiles keep working: their device becomes a link.
    op.execute(
        "INSERT INTO author_devices (device_hash, author_id) "
        "SELECT device_hash, id FROM authors WHERE device_hash IS NOT NULL"
    )


def downgrade() -> None:
    op.drop_table("author_devices")
    op.drop_constraint("uq_authors_google_sub", "authors", type_="unique")
    op.drop_column("authors", "picture_url")
    op.drop_column("authors", "email")
    op.drop_column("authors", "google_sub")
