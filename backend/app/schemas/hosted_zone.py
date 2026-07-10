from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
import re


class HostedZoneCreate(BaseModel):
    domain_name: str
    type: str = "PUBLIC"
    comment: Optional[str] = None

    @field_validator("domain_name")
    @classmethod
    def validate_domain(cls, v: str) -> str:
        v = v.strip().lower()
        if not v.endswith("."):
            v = v + "."
        pattern = r'^([a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?\.)+$'
        if not re.match(pattern, v):
            raise ValueError("Invalid domain name (must be a valid FQDN)")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v.upper() not in ("PUBLIC", "PRIVATE"):
            raise ValueError("Type must be PUBLIC or PRIVATE")
        return v.upper()


class HostedZoneUpdate(BaseModel):
    comment: Optional[str] = None


class HostedZoneResponse(BaseModel):
    id: str
    domain_name: str
    type: str
    comment: Optional[str] = None
    record_count: int
    owner_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
