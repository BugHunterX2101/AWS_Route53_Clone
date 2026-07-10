from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1 import auth, hosted_zones, dns_records
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.import_export_service import ImportExportService

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(hosted_zones.router)
router.include_router(dns_records.router)


# Export endpoint at zone level
@router.get("/hosted-zones/{zone_id}/export")
def export_zone(
    zone_id: str,
    format: Optional[str] = Query(default="json"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = ImportExportService(db)
    if format == "bind":
        content = svc.export_bind(zone_id, current_user.id)
        return PlainTextResponse(
            content=content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={zone_id}.txt"},
        )
    data = svc.export_json(zone_id, current_user.id)
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": f"attachment; filename={zone_id}.json"},
    )
