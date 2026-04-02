from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


class AssetPrice(BaseModel):
    id: Optional[int] = None
    symbol: str
    name: str
    price: float
    change_1h: Optional[float] = 0.0
    change_24h: Optional[float] = 0.0
    volume_24h: Optional[float] = 0.0
    market_cap: Optional[float] = 0.0
    asset_type: str  # "crypto" or "commodity"
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class MarketContext(BaseModel):
    usd_index: Optional[float] = None
    bond_yield_10y: Optional[float] = None
    vix: Optional[float] = None
    news_sentiment: Optional[float] = None  # -1 to 1
    on_chain_activity: Optional[float] = None  # normalized 0-1
    timestamp: Optional[datetime] = None


class BaseSignal(BaseModel):
    asset: str
    signal: str  # BUY, SELL, HOLD
    confidence: float = Field(ge=0.0, le=1.0)
    price_change: Optional[float] = None
    trend: Optional[str] = None
    drivers: Optional[List[str]] = []
    timestamp: Optional[datetime] = None


class ModelOutput(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: Optional[int] = None
    asset: str
    model_name: str  # openai, claude, gemini
    signal: str
    confidence: float
    reasoning: List[str] = []
    raw_response: Optional[str] = None
    timestamp: Optional[datetime] = None


class ConsensusResult(BaseModel):
    id: Optional[int] = None
    asset: str
    final_signal: str
    confidence: float
    agreement_level: str  # high, medium, low
    models: Dict[str, Any] = {}
    dissenting_models: List[str] = []
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class Alert(BaseModel):
    id: Optional[int] = None
    asset: str
    alert_type: str  # signal_change, high_confidence, price_spike
    message: str
    signal: str
    confidence: float
    severity: str  # info, warning, critical
    is_read: bool = False
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class Brief(BaseModel):
    id: Optional[int] = None
    content: str
    key_signals: List[Dict[str, Any]] = []
    risks: List[str] = []
    date: Optional[str] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class ModelPerformance(BaseModel):
    model_config = ConfigDict(protected_namespaces=(), from_attributes=True)

    id: Optional[int] = None
    model_name: str
    asset: str
    total_predictions: int = 0
    correct_predictions: int = 0
    accuracy: float = 0.0
    weight: float = Field(default=1.0, ge=0.0)
    last_updated: Optional[datetime] = None


class FullMarketData(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    assets: List[AssetPrice] = []
    context: Optional[MarketContext] = None
    signals: List[BaseSignal] = []
    consensus: List[ConsensusResult] = []
    alerts: List[Alert] = []
    model_outputs: List[ModelOutput] = []


# ── Agent schemas ────────────────────────────────────────────────────────────

class AgentStatus(BaseModel):
    agent: str
    status: str  # active, idle, error
    last_run: Optional[str] = None
    notes: Optional[str] = None


class AgentActivity(BaseModel):
    id: Optional[int] = None
    agent_name: str
    action_type: str
    summary: Optional[str] = None
    details: Optional[Any] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrchestratorBriefing(BaseModel):
    id: Optional[int] = None
    content: str
    agent_statuses: List[AgentStatus] = []
    date: Optional[str] = None
    timestamp: Optional[datetime] = None


class MarketingContentItem(BaseModel):
    id: Optional[int] = None
    content_type: str
    title: Optional[str] = None
    content: str
    asset_context: Optional[Any] = None
    timestamp: Optional[datetime] = None


class MarketIntelReport(BaseModel):
    id: Optional[int] = None
    report_type: str
    content: str
    assets_covered: List[str] = []
    date: Optional[str] = None
    timestamp: Optional[datetime] = None


class SupportChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    message: str
    timestamp: Optional[datetime] = None


class AnalyticsReport(BaseModel):
    id: Optional[int] = None
    content: str
    metrics: Dict[str, Any] = {}
    date: Optional[str] = None
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class OnboardRequest(BaseModel):
    name: Optional[str] = None
    interest: Optional[str] = None
    experience: Optional[str] = None


class AdminQueryRequest(BaseModel):
    query: str


class LeadInsightRequest(BaseModel):
    lead_context: str


class AnomalyCheckRequest(BaseModel):
    metrics: Dict[str, Any]


class DeepDiveRequest(BaseModel):
    symbol: str

