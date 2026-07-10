from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class HostedZone(Base):
    __tablename__ = "hosted_zones"

    id = Column(String, primary_key=True)  # zone-XXXXXXXXXXXXXXX format
    domain_name = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False, default="PUBLIC")  # PUBLIC | PRIVATE
    comment = Column(Text, nullable=True)
    record_count = Column(Integer, default=0)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="hosted_zones")
    dns_records = relationship("DnsRecord", back_populates="hosted_zone", cascade="all, delete-orphan")
