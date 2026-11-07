"""Track where an idea came from and its rank/score there (e.g. Fix My Itch).

Revision ID: 0002
Revises: 0001
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Additive and nullable: safe to run before the new code ships (expand step).
    op.add_column("ideas", sa.Column("source", sa.String(40)))
    op.add_column("ideas", sa.Column("source_rank", sa.Integer))
    op.add_column("ideas", sa.Column("source_score", sa.Float))
    op.create_index("ix_ideas_source_rank", "ideas", ["source", "source_rank"])


def downgrade() -> None:
    op.drop_index("ix_ideas_source_rank", table_name="ideas")
    op.drop_column("ideas", "source_score")
    op.drop_column("ideas", "source_rank")
    op.drop_column("ideas", "source")
