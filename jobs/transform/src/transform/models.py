"""Data models for transform pipeline."""

from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, Field


class RawTransaction(BaseModel):
    """Transaction from mf_raw schema."""

    hash: str
    date: date
    description: str
    amount: int
    category: str
    sub_category: str | None
    account_name: str
    memo: str | None
    is_transfer: bool
    is_recurring: bool


class TransformedTransaction(BaseModel):
    """Transaction for kanjo schema."""

    hash: str
    raw_hash: str
    date: date
    amount: int
    account_name: str
    description: str
    merchant_id: UUID | None
    category_id: str
    is_transfer: bool
    is_recurring: bool
    transfer_pair_hash: str | None = None
    category_confidence: int | None = None
    merchant_confidence: int | None = None
    transform_version: int = 1


class Merchant(BaseModel):
    """Merchant registry entry."""

    id: UUID
    raw_description: str
    normalized_name: str
    display_name: str | None = None
    icon: str | None = None


class Category(BaseModel):
    """Category definition."""

    id: str
    mf_category: str
    display_name: str
    icon: str
    color: str
    is_income: bool
    sort_order: int


class TransformRunStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TransformRun(BaseModel):
    """Transform job run record."""

    id: UUID
    trigger_job_run_id: UUID | None = None
    status: TransformRunStatus
    started_at: datetime | None = None
    completed_at: datetime | None = None
    transactions_processed: int = 0
    transactions_transformed: int = 0
    merchants_created: int = 0
    transfers_matched: int = 0
    llm_calls_made: int = 0
    error: str | None = None


class TransformStats(BaseModel):
    """Statistics for a transform run."""

    transactions_processed: int = 0
    transactions_transformed: int = 0
    merchants_created: int = 0
    transfers_matched: int = 0
    llm_calls_made: int = 0


class CategorizeOutput(BaseModel):
    """LLM categorization result."""

    category_id: str
    confidence: int = Field(ge=0, le=100)
    reasoning: str | None = None


class MerchantOutput(BaseModel):
    """LLM merchant normalization result."""

    normalized_name: str
    display_name: str | None = None
    icon: str | None = None
    confidence: int = Field(ge=0, le=100)
