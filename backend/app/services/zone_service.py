import uuid
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timezone

from app.models.hosted_zone import HostedZone
from app.models.dns_record import DnsRecord
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneUpdate


def _zone_id() -> str:
    return "Z" + uuid.uuid4().hex[:13].upper()


def _make_ns_values(domain: str) -> list[str]:
    """Generate 4 mock Route53-style NS records."""
    base = domain.rstrip(".")
    return [
        f"ns-{i}.awsdns-{i:02d}.com." for i in range(1, 5)
    ]


def _make_soa_value(domain: str) -> str:
    ns = f"ns-1.awsdns-01.com."
    admin = f"awsdns-hostmaster.amazon.com."
    return f"{ns} {admin} 1 7200 900 1209600 86400"


class ZoneService:
    def __init__(self, db: Session):
        self.db = db

    def list_zones(self, owner_id: int, q: str | None, page: int, page_size: int):
        query = self.db.query(HostedZone).filter_by(owner_id=owner_id)
        if q:
            query = query.filter(HostedZone.domain_name.contains(q.lower()))
        total = query.count()
        items = query.order_by(HostedZone.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_zone(self, zone_id: str, owner_id: int) -> HostedZone:
        zone = self.db.query(HostedZone).filter_by(id=zone_id, owner_id=owner_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Hosted zone not found")
        return zone

    def create_zone(self, payload: HostedZoneCreate, owner_id: int) -> HostedZone:
        # Check for duplicate domain
        existing = self.db.query(HostedZone).filter_by(
            domain_name=payload.domain_name, owner_id=owner_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Hosted zone for {payload.domain_name} already exists",
            )

        zone_id = _zone_id()
        zone = HostedZone(
            id=zone_id,
            domain_name=payload.domain_name,
            type=payload.type,
            comment=payload.comment,
            owner_id=owner_id,
            record_count=0,
        )
        self.db.add(zone)
        self.db.flush()

        # Auto-generate NS record
        ns_values = _make_ns_values(payload.domain_name)
        ns_record = DnsRecord(
            id=str(uuid.uuid4()),
            hosted_zone_id=zone_id,
            name=payload.domain_name,
            type="NS",
            ttl=172800,
            values=json.dumps(ns_values),
            routing_policy="SIMPLE",
            is_system=True,
        )
        self.db.add(ns_record)

        # Auto-generate SOA record
        soa_value = _make_soa_value(payload.domain_name)
        soa_record = DnsRecord(
            id=str(uuid.uuid4()),
            hosted_zone_id=zone_id,
            name=payload.domain_name,
            type="SOA",
            ttl=900,
            values=json.dumps([soa_value]),
            routing_policy="SIMPLE",
            is_system=True,
        )
        self.db.add(soa_record)

        zone.record_count = 2
        self.db.commit()
        self.db.refresh(zone)
        return zone

    def update_zone(self, zone_id: str, payload: HostedZoneUpdate, owner_id: int) -> HostedZone:
        zone = self.get_zone(zone_id, owner_id)
        if payload.comment is not None:
            zone.comment = payload.comment
        zone.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(zone)
        return zone

    def delete_zone(self, zone_id: str, owner_id: int) -> None:
        zone = self.get_zone(zone_id, owner_id)
        self.db.delete(zone)
        self.db.commit()
