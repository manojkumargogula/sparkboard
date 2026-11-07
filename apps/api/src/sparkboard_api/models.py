"""ORM models. The ``ideas`` table keeps the brief's required columns
(id, content, created_at) and adds product fields around them."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class IdeaStatus(enum.StrEnum):
    OPEN = "open"
    PLANNED = "planned"
    BUILDING = "building"
    SHIPPED = "shipped"


class Author(Base):
    __tablename__ = "authors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Legacy/system key (anonymous profiles, importers). Devices link via AuthorDevice.
    device_hash: Mapped[str | None] = mapped_column(String(64), unique=True)
    display_name: Mapped[str] = mapped_column(String(40))
    avatar_seed: Mapped[str] = mapped_column(String(40))
    google_sub: Mapped[str | None] = mapped_column(String(64), unique=True)
    email: Mapped[str | None] = mapped_column(String(320))
    picture_url: Mapped[str | None] = mapped_column(String(512))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AuthorDevice(Base):
    """A browser (device token hash) signed in as an author."""

    __tablename__ = "author_devices"

    device_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    author_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("authors.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Idea(Base):
    __tablename__ = "ideas"
    __table_args__ = (
        CheckConstraint("char_length(content) BETWEEN 3 AND 1000", name="ideas_content_len"),
        Index("ix_ideas_created_at", "created_at"),
        Index("ix_ideas_vote_count", "vote_count"),
        Index("ix_ideas_tags", "tags", postgresql_using="gin"),
        Index("ix_ideas_source_rank", "source", "source_rank"),
        Index(
            "ix_ideas_content_trgm",
            "content",
            postgresql_using="gin",
            postgresql_ops={"content": "gin_trgm_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    title: Mapped[str | None] = mapped_column(String(120))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String(24)), server_default="{}")
    status: Mapped[IdeaStatus] = mapped_column(
        Enum(IdeaStatus, name="idea_status", values_callable=lambda e: [m.value for m in e]),
        server_default=IdeaStatus.OPEN.value,
    )
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("authors.id", ondelete="SET NULL")
    )
    vote_count: Mapped[int] = mapped_column(Integer, server_default="0")
    comment_count: Mapped[int] = mapped_column(Integer, server_default="0")
    # Provenance for imported ideas: where it came from and its rank/score there.
    source: Mapped[str | None] = mapped_column(String(40))
    source_rank: Mapped[int | None] = mapped_column(Integer)
    source_score: Mapped[float | None] = mapped_column(Float)

    author: Mapped[Author | None] = relationship(lazy="joined")


class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("idea_id", "author_id", name="uq_votes_idea_author"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("authors.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Comment(Base):
    __tablename__ = "comments"
    __table_args__ = (
        CheckConstraint("char_length(content) BETWEEN 1 AND 600", name="comments_content_len"),
        Index("ix_comments_idea_created", "idea_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    idea_id: Mapped[int] = mapped_column(ForeignKey("ideas.id", ondelete="CASCADE"))
    author_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("authors.id", ondelete="SET NULL")
    )
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    author: Mapped[Author | None] = relationship(lazy="joined")
