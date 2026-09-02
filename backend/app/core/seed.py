import uuid
from datetime import datetime, timezone
from app.core.database import SessionLocal
from app.models.user import User
from app.models.camera import Department, VMS
from app.core.security import hash_password
from loguru import logger

def seed_initial_data():
    db = SessionLocal()
    try:
        # Check admin user
        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                id=str(uuid.uuid4()),
                username="admin",
                email="admin@gujaratpolice.gov.in",
                hashed_password=hash_password("Sentinel@2026"),
                full_name="State Command Administrator",
                badge_number="GP-ADMIN-01",
                department="State Police Command Centre, Gandhinagar",
                role="Admin",
                is_active=True
            )
            db.add(admin)
            logger.info("Created default Admin user: admin / Sentinel@2026")

        # Operator user
        operator = db.query(User).filter(User.username == "operator").first()
        if not operator:
            operator = User(
                id=str(uuid.uuid4()),
                username="operator",
                email="operator@vadodara.gov.in",
                hashed_password=hash_password("Operator@2026"),
                full_name="Vadodara Traffic Controller",
                badge_number="VTC-OP-44",
                department="Vadodara Traffic Branch",
                role="Operator",
                is_active=True
            )
            db.add(operator)
            logger.info("Created default Operator user: operator / Operator@2026")

        # Investigator user
        investigator = db.query(User).filter(User.username == "investigator").first()
        if not investigator:
            investigator = User(
                id=str(uuid.uuid4()),
                username="investigator",
                email="cid.crime@gujarat.gov.in",
                hashed_password=hash_password("Investigate@2026"),
                full_name="CID Crime Investigation Officer",
                badge_number="CID-INV-109",
                department="CID Crime Branch, Gujarat",
                role="Investigator",
                is_active=True
            )
            db.add(investigator)
            logger.info("Created default Investigator user: investigator / Investigate@2026")

        # Initial Departments
        departments = [
            {"id": "DEPT_VADODARA_TRAFFIC", "name": "Vadodara City Traffic Police", "district": "Vadodara"},
            {"id": "DEPT_ANAND_HIGHWAY", "name": "Anand Highway Patrol Division", "district": "Anand"},
            {"id": "DEPT_AHMEDABAD_COMMAND", "name": "Ahmedabad Smart City Command & Control (ICCC)", "district": "Ahmedabad"},
            {"id": "DEPT_SURAT_SURVEILLANCE", "name": "Surat City Surveillance Network", "district": "Surat"},
            {"id": "DEPT_GANDHINAGAR_HQ", "name": "Gujarat State CCTV Command Centre", "district": "Gandhinagar"},
        ]
        for d in departments:
            if not db.query(Department).filter(Department.id == d["id"]).first():
                db.add(Department(**d))

        # Initial VMS Gateways
        vms_nodes = [
            {"id": "VMS_GUJ_HIGHWAY_01", "name": "Gujarat State Highway VMS Node A", "vendor": "Milestone XProtect", "host": "10.200.1.10", "port": 554, "protocol": "RTSP"},
            {"id": "VMS_AHM_ICCC_02", "name": "Ahmedabad Smart City VMS Cluster", "vendor": "Genetec Security Center", "host": "10.200.2.10", "port": 554, "protocol": "RTSP"},
            {"id": "VMS_VAD_TRAFFIC_03", "name": "Vadodara Traffic Surveillance VMS", "vendor": "HikCentral Enterprise", "host": "10.200.3.10", "port": 554, "protocol": "RTSP"},
        ]
        for v in vms_nodes:
            if not db.query(VMS).filter(VMS.id == v["id"]).first():
                db.add(VMS(**v))

        db.commit()
        logger.info("Initial seed data inserted successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_initial_data()
