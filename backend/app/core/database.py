from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings
from loguru import logger

# Neon PostgreSQL connection
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=300
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Verify PostGIS and create all database tables."""
    try:
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
            res = conn.execute(text("SELECT PostGIS_Version();")).fetchone()
            logger.info(f"PostGIS initialized successfully: {res[0] if res else 'Unknown'}")
        
        # Import models so Base metadata is populated
        import app.models  # noqa: F401
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema tables created / verified successfully.")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise
