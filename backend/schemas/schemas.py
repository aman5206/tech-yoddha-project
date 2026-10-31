from typing import List, Optional
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    engine_id: str
    # Raw (unscaled) readings, one row per cycle, columns in /models/status -> features order
    sensor_data: List[List[float]] = Field(min_length=1)
    model: Optional[str] = None


class PredictResponse(BaseModel):
    engine_id: str
    predicted_rul: float
    health_status: str
    maintenance_action: str
    model: str
    model_version: str
    padded: bool
    disclaimer: str = "Prototype output. Not an aviation safety or maintenance authorization."
