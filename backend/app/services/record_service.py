import uuid
import json
from sqlalchemy.orm import Session
from fastapi import HTTPException
from datetime import datetime, timezone

from app.models.dns_record import DnsRecord
from app.models.hosted_zone import HostedZone
from app.schemas.dns_record import DnsRecordCreate, DnsRecordUpdate


class RecordService:
    def __init__(self, db: Session):
        self.db = db

    def _get_zone(self, zone_id: str, owner_id: int) -> HostedZone:
        zone = self.db.query(HostedZone).filter_by(id=zone_id, owner_id=owner_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Hosted zone not found")
        return zone

    def list_records(
        self,
        zone_id: str,
        owner_id: int,
        q: str | None,
        record_type: str | None,
        page: int,
        page_size: int,
    ):
        self._get_zone(zone_id, owner_id)
        query = self.db.query(DnsRecord).filter_by(hosted_zone_id=zone_id)
        if q:
            query = query.filter(DnsRecord.name.contains(q))
        if record_type:
            query = query.filter(DnsRecord.type == record_type.upper())
        total = query.count()
        items = query.order_by(DnsRecord.created_at.asc()).offset((page - 1) * page_size).limit(page_size).all()
        return items, total

    def get_record(self, zone_id: str, record_id: str, owner_id: int) -> DnsRecord:
        self._get_zone(zone_id, owner_id)
        record = self.db.query(DnsRecord).filter_by(id=record_id, hosted_zone_id=zone_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        return record

    def create_record(self, zone_id: str, payload: DnsRecordCreate, owner_id: int) -> DnsRecord:
        zone = self._get_zone(zone_id, owner_id)
        record = DnsRecord(
            id=str(uuid.uuid4()),
            hosted_zone_id=zone_id,
            name=payload.name,
            type=payload.type,
            ttl=payload.ttl,
            values=json.dumps(payload.values),
            routing_policy=payload.routing_policy,
            is_system=False,
        )
        self.db.add(record)
        # Commit first, then recount to avoid SQLAlchemy flush double-counting
        self.db.commit()
        zone.record_count = self.db.query(DnsRecord).filter_by(hosted_zone_id=zone_id).count()
        self.db.commit()
        self.db.refresh(record)
        return record

    def update_record(self, zone_id: str, record_id: str, payload: DnsRecordUpdate, owner_id: int) -> DnsRecord:
        record = self.get_record(zone_id, record_id, owner_id)
        if record.is_system:
            raise HTTPException(status_code=403, detail="Cannot modify system-managed records")
        if payload.ttl is not None:
            record.ttl = payload.ttl
        if payload.values is not None:
            record.values = json.dumps(payload.values)
        if payload.routing_policy is not None:
            record.routing_policy = payload.routing_policy
        record.updated_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(record)
        return record

    def delete_record(self, zone_id: str, record_id: str, owner_id: int) -> None:
        zone = self._get_zone(zone_id, owner_id)
        record = self.get_record(zone_id, record_id, owner_id)
        if record.is_system:
            raise HTTPException(
                status_code=403,
                detail="Cannot delete system-managed records (NS/SOA). This matches Route53 behavior.",
            )
        self.db.delete(record)
        count = self.db.query(DnsRecord).filter_by(hosted_zone_id=zone_id).count() - 1
        zone.record_count = max(0, count)
        self.db.commit()
