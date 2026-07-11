"""Parse BIND zone files and import DNS records in bulk."""
import json
import re
import uuid
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.dns_record import DnsRecord
from app.models.hosted_zone import HostedZone


SUPPORTED_TYPES = {"A", "AAAA", "CNAME", "TXT", "MX", "NS", "PTR", "SRV", "CAA"}


def _parse_bind_line(line: str, origin: str, default_ttl: int) -> Dict[str, Any] | None:
    """Parse a single BIND RR line into a record dict. Returns None if unparseable."""
    line = line.strip()
    # Strip comments
    if ";" in line:
        line = line[:line.index(";")].strip()
    if not line:
        return None

    # Tokenize
    parts = line.split()
    if len(parts) < 4:
        return None

    # BIND format: name [ttl] [class] type rdata
    # We detect position of class/ttl heuristically
    idx = 0
    name = parts[idx]; idx += 1

    # Resolve relative name
    if name == "@":
        name = origin
    elif not name.endswith("."):
        name = f"{name}.{origin}" if origin else name

    ttl = default_ttl
    # Optional TTL (numeric)
    if parts[idx].isdigit():
        ttl = int(parts[idx]); idx += 1

    # Optional class (IN, CH, HS)
    if parts[idx].upper() in ("IN", "CH", "HS"):
        idx += 1

    if idx >= len(parts):
        return None

    rtype = parts[idx].upper(); idx += 1

    if rtype not in SUPPORTED_TYPES:
        return None

    rdata_parts = parts[idx:]

    # Parse rdata by type
    try:
        if rtype in ("A", "AAAA", "CNAME", "PTR", "NS"):
            values = [" ".join(rdata_parts)]
        elif rtype == "TXT":
            raw = " ".join(rdata_parts)
            # Strip surrounding quotes
            raw = re.sub(r'"', "", raw)
            values = [raw]
        elif rtype == "MX":
            priority = int(rdata_parts[0])
            hostname = rdata_parts[1] if len(rdata_parts) > 1 else ""
            values = [{"priority": priority, "hostname": hostname}]
        elif rtype == "SRV":
            priority, weight, port = int(rdata_parts[0]), int(rdata_parts[1]), int(rdata_parts[2])
            target = rdata_parts[3] if len(rdata_parts) > 3 else ""
            values = [{"priority": priority, "weight": weight, "port": port, "target": target}]
        elif rtype == "CAA":
            flag = int(rdata_parts[0])
            tag = rdata_parts[1] if len(rdata_parts) > 1 else ""
            value = rdata_parts[2].strip('"') if len(rdata_parts) > 2 else ""
            values = [{"flag": flag, "tag": tag, "value": value}]
        else:
            values = [" ".join(rdata_parts)]
    except (ValueError, IndexError):
        return None

    return {"name": name, "type": rtype, "ttl": ttl, "values": values}


def parse_bind(zone_text: str, origin: str = "") -> List[Dict[str, Any]]:
    """Parse a BIND zone file string into a list of record dicts."""
    records: List[Dict[str, Any]] = []
    default_ttl = 300

    if not origin.endswith("."):
        origin = origin + "." if origin else ""

    for line in zone_text.splitlines():
        stripped = line.strip()

        # Handle $ORIGIN directive
        if stripped.upper().startswith("$ORIGIN"):
            parts = stripped.split()
            if len(parts) >= 2:
                origin = parts[1]
                if not origin.endswith("."):
                    origin += "."
            continue

        # Handle $TTL directive
        if stripped.upper().startswith("$TTL"):
            parts = stripped.split()
            if len(parts) >= 2 and parts[1].isdigit():
                default_ttl = int(parts[1])
            continue

        record = _parse_bind_line(line, origin, default_ttl)
        if record:
            records.append(record)

    return records


class ImportService:
    def __init__(self, db: Session):
        self.db = db

    def _get_zone(self, zone_id: str, owner_id: int) -> HostedZone:
        zone = self.db.query(HostedZone).filter_by(id=zone_id, owner_id=owner_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Hosted zone not found")
        return zone

    def import_records(
        self,
        zone_id: str,
        records: List[Dict[str, Any]],
        owner_id: int,
        skip_existing: bool = True,
    ) -> Tuple[int, int]:
        """
        Bulk-import records into a zone.
        Returns (created_count, skipped_count).
        """
        zone = self._get_zone(zone_id, owner_id)
        created = 0
        skipped = 0

        for rec in records:
            rtype = rec.get("type", "").upper()
            if rtype not in SUPPORTED_TYPES:
                skipped += 1
                continue

            name = rec.get("name", "").strip()
            if not name:
                skipped += 1
                continue

            # Skip SOA records (system-managed)
            if rtype == "SOA":
                skipped += 1
                continue

            values = rec.get("values", [])
            ttl = int(rec.get("ttl", 300))
            routing_policy = rec.get("routing_policy", "SIMPLE")

            # Check for duplicate (same name + type) if skip_existing
            if skip_existing:
                exists = self.db.query(DnsRecord).filter_by(
                    hosted_zone_id=zone_id, name=name, type=rtype
                ).first()
                if exists:
                    skipped += 1
                    continue

            self.db.add(DnsRecord(
                id=str(uuid.uuid4()),
                hosted_zone_id=zone_id,
                name=name,
                type=rtype,
                ttl=ttl,
                values=json.dumps(values),
                routing_policy=routing_policy,
                is_system=False,
            ))
            created += 1

        # Commit first, then recount — avoids SQLAlchemy flush vs commit timing bugs
        self.db.commit()
        zone.record_count = self.db.query(DnsRecord).filter_by(hosted_zone_id=zone_id).count()
        self.db.commit()
        return created, skipped

    def bulk_delete_records(
        self,
        zone_id: str,
        record_ids: List[str],
        owner_id: int,
    ) -> int:
        """Delete multiple records at once. Returns number deleted."""
        zone = self._get_zone(zone_id, owner_id)

        deleted = 0
        for rid in record_ids:
            record = self.db.query(DnsRecord).filter_by(
                id=rid, hosted_zone_id=zone_id
            ).first()
            if record and not record.is_system:
                self.db.delete(record)
                deleted += 1

        # Commit first, then recount — so the count reflects actual state
        self.db.commit()
        zone.record_count = self.db.query(DnsRecord).filter_by(hosted_zone_id=zone_id).count()
        self.db.commit()
        return deleted

