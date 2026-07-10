"""Seed the database with a demo user and sample hosted zones/records."""
import json
import uuid
from sqlalchemy.orm import Session as DBSession
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User
from app.models.hosted_zone import HostedZone
from app.models.dns_record import DnsRecord


def _zone_id() -> str:
    import uuid
    return "Z" + uuid.uuid4().hex[:13].upper()


DEMO_EMAIL = "admin@example.com"
DEMO_PASSWORD = "password123"
DEMO_NAME = "Admin User"

SAMPLE_ZONES = [
    {
        "domain_name": "example.com.",
        "type": "PUBLIC",
        "comment": "Main company domain",
    },
    {
        "domain_name": "api.internal.",
        "type": "PRIVATE",
        "comment": "Internal API domain",
    },
]

SAMPLE_RECORDS = {
    "example.com.": [
        {"name": "example.com.", "type": "A", "ttl": 300, "values": ["93.184.216.34"]},
        {"name": "www.example.com.", "type": "CNAME", "ttl": 300, "values": ["example.com."]},
        {"name": "mail.example.com.", "type": "A", "ttl": 300, "values": ["93.184.216.35"]},
        {"name": "example.com.", "type": "MX", "ttl": 300, "values": [{"priority": 10, "hostname": "mail.example.com."}]},
        {"name": "example.com.", "type": "TXT", "ttl": 300, "values": ["v=spf1 include:_spf.example.com ~all"]},
    ],
    "api.internal.": [
        {"name": "api.internal.", "type": "A", "ttl": 60, "values": ["10.0.1.10"]},
        {"name": "db.api.internal.", "type": "A", "ttl": 60, "values": ["10.0.1.20"]},
    ],
}


def seed_data():
    db: DBSession = SessionLocal()
    try:
        # Check if demo user already exists
        existing = db.query(User).filter_by(email=DEMO_EMAIL).first()
        if existing:
            return  # Already seeded

        # Create demo user
        user = User(
            email=DEMO_EMAIL,
            password_hash=hash_password(DEMO_PASSWORD),
            name=DEMO_NAME,
        )
        db.add(user)
        db.flush()

        for zone_data in SAMPLE_ZONES:
            zone_id = _zone_id()
            zone = HostedZone(
                id=zone_id,
                domain_name=zone_data["domain_name"],
                type=zone_data["type"],
                comment=zone_data["comment"],
                owner_id=user.id,
                record_count=0,
            )
            db.add(zone)
            db.flush()

            # NS record
            ns_values = [f"ns-{i}.awsdns-{i:02d}.com." for i in range(1, 5)]
            db.add(DnsRecord(
                id=str(uuid.uuid4()),
                hosted_zone_id=zone_id,
                name=zone_data["domain_name"],
                type="NS",
                ttl=172800,
                values=json.dumps(ns_values),
                routing_policy="SIMPLE",
                is_system=True,
            ))

            # SOA record
            ns = "ns-1.awsdns-01.com."
            admin = "awsdns-hostmaster.amazon.com."
            soa_val = f"{ns} {admin} 1 7200 900 1209600 86400"
            db.add(DnsRecord(
                id=str(uuid.uuid4()),
                hosted_zone_id=zone_id,
                name=zone_data["domain_name"],
                type="SOA",
                ttl=900,
                values=json.dumps([soa_val]),
                routing_policy="SIMPLE",
                is_system=True,
            ))

            # Sample records
            sample_records = SAMPLE_RECORDS.get(zone_data["domain_name"], [])
            for rec in sample_records:
                db.add(DnsRecord(
                    id=str(uuid.uuid4()),
                    hosted_zone_id=zone_id,
                    name=rec["name"],
                    type=rec["type"],
                    ttl=rec["ttl"],
                    values=json.dumps(rec["values"]),
                    routing_policy="SIMPLE",
                    is_system=False,
                ))

            # Update record count
            count = db.query(DnsRecord).filter_by(hosted_zone_id=zone_id).count()
            zone.record_count = count

        db.commit()
        print(f"✅ Seeded demo user: {DEMO_EMAIL} / {DEMO_PASSWORD}")
        print(f"✅ Seeded {len(SAMPLE_ZONES)} hosted zones with sample records")

    except Exception as e:
        db.rollback()
        print(f"⚠️  Seed error (may already be seeded): {e}")
    finally:
        db.close()


if __name__ == "__main__":
    from app.core.database import create_tables
    create_tables()
    seed_data()
