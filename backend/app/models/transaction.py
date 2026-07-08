import uuid
from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, Date, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("businesses.id", ondelete="CASCADE"), nullable=False, index=True)
    saltedge_transaction_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[datetime] = mapped_column(Date, nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(500), nullable=True)
    category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_inflow: Mapped[bool] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    business = relationship("Business", back_populates="transactions")
