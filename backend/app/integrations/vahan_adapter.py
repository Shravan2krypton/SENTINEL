from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel

class VehicleRegistrationRecord(BaseModel):
    registration_number: str
    owner_name: str
    maker_model: str
    vehicle_class: str
    fuel_type: str
    registration_date: str
    rto_location: str
    fitness_validity: str
    insurance_validity: str
    status: str

class VehicleRegistryAdapter(ABC):
    """
    Standard interface for national vehicle registry connectors (e.g. VAHAN / Sarathi).
    Demonstrates architectural readiness without making fake claims of unauthenticated live integration.
    """
    @abstractmethod
    def lookup_vehicle(self, plate_number: str) -> Optional[VehicleRegistrationRecord]:
        pass

class MockVAHANAdapter(VehicleRegistryAdapter):
    """
    Representative VAHAN connector with realistic mock records for Gujarat registered vehicles.
    """
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def lookup_vehicle(self, plate_number: str) -> Optional[VehicleRegistrationRecord]:
        clean = plate_number.replace("-", "").replace(" ", "").upper()
        # Representative data for standard demonstration vehicle
        if clean == "GJ06AB1234":
            return VehicleRegistrationRecord(
                registration_number="GJ06AB1234",
                owner_name="Gujarat Logistics Corp / Suresh Patel",
                maker_model="Tata Harrier XZA+ (Silver)",
                vehicle_class="Motor Car (LMV)",
                fuel_type="Diesel",
                registration_date="2022-04-12",
                rto_location="Vadodara RTO (GJ-06)",
                fitness_validity="2037-04-11",
                insurance_validity="2026-11-30",
                status="ACTIVE"
            )
        return None

vahan_adapter = MockVAHANAdapter()
