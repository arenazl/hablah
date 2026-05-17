from pydantic import BaseModel
from typing import Optional


class TemplateBase(BaseModel):
    slug: str
    name: str
    description: str = ""
    rigor: int = 3
    challenges_per_min: int = 2
    allow_interruptions: bool = False
    block_on_repeat: bool = True
    json_output: bool = True
    tones: list[str] = []
    voice_id: str = ""
    voice_label: str = ""
    icon_bg: str = "#00B37E"
    is_preset: bool = False
    version: str = "v1.0"
    status: str = "active"


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rigor: Optional[int] = None
    challenges_per_min: Optional[int] = None
    allow_interruptions: Optional[bool] = None
    block_on_repeat: Optional[bool] = None
    json_output: Optional[bool] = None
    tones: Optional[list[str]] = None
    voice_id: Optional[str] = None
    voice_label: Optional[str] = None
    icon_bg: Optional[str] = None
    status: Optional[str] = None


class TemplateResponse(TemplateBase):
    id: int
    assigned_count: int = 0

    class Config:
        from_attributes = True


# ─── Topics ─────────────────────────────────────────────────────────────────

class TopicBase(BaseModel):
    slug: str
    title: str
    category: str = "general"
    seed_prompts: dict = {}
    keywords: list[str] = []
    levels: list[str] = []
    is_hot: bool = False
    is_active: bool = True


class TopicCreate(TopicBase):
    pass


class TopicUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    seed_prompts: Optional[dict] = None
    keywords: Optional[list[str]] = None
    levels: Optional[list[str]] = None
    is_hot: Optional[bool] = None
    is_active: Optional[bool] = None


class TopicResponse(TopicBase):
    id: int
    usage_count: int = 0

    class Config:
        from_attributes = True


# ─── Sessions ───────────────────────────────────────────────────────────────

class SessionStartRequest(BaseModel):
    topic_id: Optional[int] = None
    template_id: Optional[int] = None


class SessionResponse(BaseModel):
    id: int
    user_id: int
    template_id: Optional[int]
    topic_id: Optional[int]
    cefr_at_start: str
    status: str
    started_at: str
    ended_at: Optional[str] = None
    duration_seconds: Optional[int] = None
    transcript: list = []
    metrics: dict = {}
    report: dict = {}
    score: Optional[int] = None
    is_rescue: bool = False

    class Config:
        from_attributes = True


class TranscriptLine(BaseModel):
    who: str  # "ai" | "user"
    text: str
    ts: Optional[float] = None  # seg desde inicio
    tag: Optional[dict] = None  # {"kind": "err"|"ok", "text": "..."}


class SessionEndRequest(BaseModel):
    transcript: list[TranscriptLine] = []


# ─── Topic progress ─────────────────────────────────────────────────────────

class TopicProgressResponse(BaseModel):
    id: int
    topic_id: int
    stages_done: int
    stages_total: int
    pct: int
    minutes_spoken: int
    sessions_count: int

    class Config:
        from_attributes = True
