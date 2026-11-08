"""Initial schema: authors, ideas, votes, comments.

Revision ID: 0001
Revises:
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

STATUS = postgresql.ENUM("open", "planned", "building", "shipped", name="idea_status")


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    STATUS.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "authors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("device_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("display_name", sa.String(40), nullable=False),
        sa.Column("avatar_seed", sa.String(40), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "ideas",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column("title", sa.String(120)),
        sa.Column("tags", postgresql.ARRAY(sa.String(24)), server_default="{}", nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="idea_status", create_type=False),
            server_default="open",
            nullable=False,
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("authors.id", ondelete="SET NULL"),
        ),
        sa.Column("vote_count", sa.Integer, server_default="0", nullable=False),
        sa.Column("comment_count", sa.Integer, server_default="0", nullable=False),
        sa.CheckConstraint("char_length(content) BETWEEN 3 AND 1000", name="ideas_content_len"),
    )
    op.create_index("ix_ideas_created_at", "ideas", ["created_at"])
    op.create_index("ix_ideas_vote_count", "ideas", ["vote_count"])
    op.create_index("ix_ideas_tags", "ideas", ["tags"], postgresql_using="gin")
    op.create_index(
        "ix_ideas_content_trgm",
        "ideas",
        ["content"],
        postgresql_using="gin",
        postgresql_ops={"content": "gin_trgm_ops"},
    )

    op.create_table(
        "votes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "idea_id", sa.Integer, sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("authors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint("idea_id", "author_id", name="uq_votes_idea_author"),
    )

    op.create_table(
        "comments",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column(
            "idea_id", sa.Integer, sa.ForeignKey("ideas.id", ondelete="CASCADE"), nullable=False
        ),
        sa.Column(
            "author_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("authors.id", ondelete="SET NULL"),
        ),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint("char_length(content) BETWEEN 1 AND 600", name="comments_content_len"),
    )
    op.create_index("ix_comments_idea_created", "comments", ["idea_id", "created_at"])


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("votes")
    op.drop_table("ideas")
    op.drop_table("authors")
    STATUS.drop(op.get_bind(), checkfirst=True)
