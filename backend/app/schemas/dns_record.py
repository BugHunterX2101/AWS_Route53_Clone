from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
from datetime import datetime


class DnsRecordCreate(BaseModel):
    name: str
    type: str
    ttl: int = 300
    values: List[Any]
    routing_policy: str = "SIMPLE"

    @field_validator("ttl")
    @classmethod
    def ttl_range(cls, v: int) -> int:
        if not (0 <= v <= 172800):
            raise ValueError("TTL must be between 0 and 172800 seconds")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = ["A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"]
        if v.upper() not in allowed:
            raise ValueError(f"Type must be one of {allowed}")
        return v.upper()

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()


class DnsRecordUpdate(BaseModel):
    ttl: Optional[int] = None
    values: Optional[List[Any]] = None
    routing_policy: Optional[str] = None

    @field_validator("ttl")
    @classmethod
    def ttl_range(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not (0 <= v <= 172800):
            raise ValueError("TTL must be between 0 and 172800 seconds")
        return v


class DnsRecordResponse(BaseModel):
    id: str
    hosted_zone_id: str
    name: str
    type: str
    ttl: int
    values: List[Any]
    routing_policy: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
