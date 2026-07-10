import json
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import Optional, List, Any
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_user, PaginationParams
from app.models.user import User
from app.models.dns_record import DnsRecord
from app.schemas.dns_record import DnsRecordCreate, DnsRecordUpdate, DnsRecordResponse
from app.schemas.common import PaginatedResponse
from app.services.record_service import RecordService
from app.services.import_export_service import ImportExportService
from app.services.import_service import ImportService, parse_bind

router = APIRouter(prefix="/hosted-zones/{zone_id}/records", tags=["dns-records"])


def _serialize(record: DnsRecord) -> DnsRecordResponse:
    return DnsRecordResponse(
        id=record.id,
        hosted_zone_id=record.hosted_zone_id,
        name=record.name,
        type=record.type,
        ttl=record.ttl,
        values=json.loads(record.values),
        routing_policy=record.routing_policy,
        is_system=record.is_system,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("", response_model=PaginatedResponse[DnsRecordResponse])
def list_records(
    zone_id: str,
    q: Optional[str] = Query(default=None),
    type: Optional[str] = Query(default=None),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = RecordService(db)
    items, total = svc.list_records(zone_id, current_user.id, q, type, pagination.page, pagination.page_size)
    return PaginatedResponse(
        items=[_serialize(r) for r in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("", response_model=DnsRecordResponse, status_code=201)
def create_record(
    zone_id: str,
    payload: DnsRecordCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = RecordService(db)
    record = svc.create_record(zone_id, payload, current_user.id)
    return _serialize(record)


@router.get("/{record_id}", response_model=DnsRecordResponse)
def get_record(
    zone_id: str,
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = RecordService(db)
    record = svc.get_record(zone_id, record_id, current_user.id)
    return _serialize(record)


@router.put("/{record_id}", response_model=DnsRecordResponse)
def update_record(
    zone_id: str,
    record_id: str,
    payload: DnsRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = RecordService(db)
    record = svc.update_record(zone_id, record_id, payload, current_user.id)
    return _serialize(record)


@router.delete("/{record_id}", status_code=204)
def delete_record(
    zone_id: str,
    record_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = RecordService(db)
    svc.delete_record(zone_id, record_id, current_user.id)


# ── Bulk delete ──────────────────────────────────────────────────────────────

class BulkDeleteRequest(BaseModel):
    ids: List[str]


@router.delete("", status_code=200)
def bulk_delete_records(
    zone_id: str,
    payload: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete multiple DNS records by ID in a single request."""
    svc = ImportService(db)
    deleted = svc.bulk_delete_records(zone_id, payload.ids, current_user.id)
    return {"deleted": deleted}


# ── Import ───────────────────────────────────────────────────────────────────

class ImportBindRequest(BaseModel):
    bind_text: str
    origin: Optional[str] = ""
    skip_existing: bool = True


class ImportJsonRequest(BaseModel):
    records: List[Any]
    skip_existing: bool = True


@router.post("/import/bind", status_code=200)
def import_bind(
    zone_id: str,
    payload: ImportBindRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import DNS records from a BIND zone file text."""
    records = parse_bind(payload.bind_text, payload.origin or "")
    svc = ImportService(db)
    created, skipped = svc.import_records(zone_id, records, current_user.id, payload.skip_existing)
    return {"created": created, "skipped": skipped, "total": len(records)}


@router.post("/import/json", status_code=200)
def import_json(
    zone_id: str,
    payload: ImportJsonRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Import DNS records from a JSON array."""
    svc = ImportService(db)
    created, skipped = svc.import_records(zone_id, payload.records, current_user.id, payload.skip_existing)
    return {"created": created, "skipped": skipped, "total": len(payload.records)}
