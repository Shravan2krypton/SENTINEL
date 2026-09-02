import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.watchlist import WatchlistEntry
from app.schemas.watchlist import WatchlistCreate, WatchlistOut, WatchlistUpdate
from app.services.watchlist_matcher import watchlist_matcher
from app.services.audit_service import audit_service
from app.api.v1.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/watchlist", tags=["Watchlist Management"])

@router.get("", response_model=List[WatchlistOut])
async def list_watchlist(
    category: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query("ACTIVE"),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(WatchlistEntry)
    if status:
        query = query.filter(WatchlistEntry.status == status.upper())
    if category:
        query = query.filter(WatchlistEntry.category == category.lower())
    if priority:
        query = query.filter(WatchlistEntry.priority == priority.upper())
    if search:
        query = query.filter(
            (WatchlistEntry.plate_number.ilike(f"%{search}%")) |
            (WatchlistEntry.description.ilike(f"%{search}%")) |
            (WatchlistEntry.owner_name.ilike(f"%{search}%"))
        )
    return query.order_by(WatchlistEntry.created_at.desc()).all()

@router.post("", response_model=WatchlistOut, status_code=status.HTTP_201_CREATED)
async def create_watchlist_entry(
    entry_in: WatchlistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    clean_plate = entry_in.plate_number.replace("-", "").replace(" ", "").upper()
    existing = db.query(WatchlistEntry).filter(WatchlistEntry.plate_number == clean_plate).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Vehicle registration {clean_plate} is already listed on the active watchlist"
        )

    entry = WatchlistEntry(
        id=f"wl_{uuid.uuid4().hex[:12]}",
        plate_number=clean_plate,
        category=entry_in.category.lower(),
        priority=entry_in.priority.upper(),
        description=entry_in.description,
        vehicle_make_model=entry_in.vehicle_make_model,
        owner_name=entry_in.owner_name,
        case_number=entry_in.case_number,
        expires_at=entry_in.expires_at,
        created_by=current_user.username,
        status="ACTIVE"
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Refresh in-memory matching cache immediately
    watchlist_matcher.refresh_cache(db)

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="CREATE_WATCHLIST_ENTRY",
        resource=f"/api/watchlist/{clean_plate}",
        details=entry_in.model_dump(exclude_none=True)
    )

    return entry

@router.put("/{entry_id}", response_model=WatchlistOut)
async def update_watchlist_entry(
    entry_id: str,
    update_in: WatchlistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Watchlist entry {entry_id} not found")

    if update_in.category is not None:
        entry.category = update_in.category.lower()
    if update_in.priority is not None:
        entry.priority = update_in.priority.upper()
    if update_in.description is not None:
        entry.description = update_in.description
    if update_in.status is not None:
        entry.status = update_in.status.upper()
    if update_in.expires_at is not None:
        entry.expires_at = update_in.expires_at

    db.commit()
    db.refresh(entry)
    watchlist_matcher.refresh_cache(db)

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="UPDATE_WATCHLIST_ENTRY",
        resource=f"/api/watchlist/{entry_id}",
        details=update_in.model_dump(exclude_none=True)
    )

    return entry

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_watchlist_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(WatchlistEntry).filter(WatchlistEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")

    db.delete(entry)
    db.commit()
    watchlist_matcher.refresh_cache(db)

    audit_service.log(
        db=db,
        username=current_user.username,
        role=current_user.role,
        action="DELETE_WATCHLIST_ENTRY",
        resource=f"/api/watchlist/{entry_id}"
    )
    return None
