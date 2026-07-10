from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.api.deps import get_current_user, PaginationParams
from app.models.user import User
from app.schemas.hosted_zone import HostedZoneCreate, HostedZoneUpdate, HostedZoneResponse
from app.schemas.common import PaginatedResponse
from app.services.zone_service import ZoneService

router = APIRouter(prefix="/hosted-zones", tags=["hosted-zones"])


@router.get("", response_model=PaginatedResponse[HostedZoneResponse])
def list_zones(
    q: Optional[str] = Query(default=None),
    pagination: PaginationParams = Depends(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ZoneService(db)
    items, total = svc.list_zones(current_user.id, q, pagination.page, pagination.page_size)
    return PaginatedResponse(
        items=[HostedZoneResponse.model_validate(z) for z in items],
        total=total,
        page=pagination.page,
        page_size=pagination.page_size,
    )


@router.post("", response_model=HostedZoneResponse, status_code=201)
def create_zone(
    payload: HostedZoneCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ZoneService(db)
    zone = svc.create_zone(payload, current_user.id)
    return HostedZoneResponse.model_validate(zone)


@router.get("/{zone_id}", response_model=HostedZoneResponse)
def get_zone(
    zone_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ZoneService(db)
    zone = svc.get_zone(zone_id, current_user.id)
    return HostedZoneResponse.model_validate(zone)


@router.put("/{zone_id}", response_model=HostedZoneResponse)
def update_zone(
    zone_id: str,
    payload: HostedZoneUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ZoneService(db)
    zone = svc.update_zone(zone_id, payload, current_user.id)
    return HostedZoneResponse.model_validate(zone)


@router.delete("/{zone_id}", status_code=204)
def delete_zone(
    zone_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ZoneService(db)
    svc.delete_zone(zone_id, current_user.id)
