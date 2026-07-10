from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.core.database import Base


class DnsRecord(Base):
    __tablename__ = "dns_records"

    id = Column(String, primary_key=True)  # UUID
    hosted_zone_id = Column(String, ForeignKey("hosted_zones.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # A|AAAA|CNAME|TXT|MX|NS|PTR|SRV|CAA
    ttl = Column(Integer, nullable=False, default=300)
    values = Column(Text, nullable=False)  # JSON-encoded
    routing_policy = Column(String, default="SIMPLE")
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    hosted_zone = relationship("HostedZone", back_populates="dns_records")
