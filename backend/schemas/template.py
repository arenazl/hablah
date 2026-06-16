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
    voice_id_en: Optional[str] = None
    voice_id_es: Optional[str] = None
    voice_id_pt: Optional[str] = None
    # v6 pedagogia + voice sliders
    pedagogy_preset: Optional[str] = "balanced"
    avoid_superlative_questions: Optional[bool] = True
    one_question_per_turn: Optional[bool] = True
    voice_speed: Optional[int] = 100
    voice_stability: Optional[int] = 50
    voice_style: Optional[int] = 30
    icon_bg: str = "#00B37E"
    is_preset: bool = False
    version: str = "v1.0"
    status: str = "active"

    # ─── Pedagogía configurable (v3) ───
    response_length: str = "short"          # terse | short | medium | long
    tutor_talk_ratio: int = 25
    proactive_questions: bool = True
    tutor_shares_opinions: bool = True
    warmth_level: int = 3
    correction_mode: str = "recast"         # none | recast | explicit_soft | explicit_strict
    correction_focus: list[str] = ["grammar", "vocab", "fluency"]
    error_threshold: str = "repeated"       # only_major | repeated | all
    max_feedback_items: int = 3
    praise_count: int = 1
    report_include_summary: bool = True
    report_include_connectors: bool = True
    report_include_vocab_suggestions: bool = True
    report_include_pronunciation: bool = False
    report_include_next_session_tip: bool = True
    opening_style: str = "direct"           # direct | warm | playful
    opening_includes_topic_intro: bool = True
    silence_tolerance_ms: int = 800
    interruption_allowed: bool = False
    scaffold_when_stuck: bool = True
    # Motor Pedagógico Adaptativo
    segmento: Optional[str] = None
    enfoque: Optional[str] = None
    curriculum_mode: Optional[str] = None
    identity_description: Optional[str] = None


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
    voice_id_en: Optional[str] = None
    voice_id_es: Optional[str] = None
    voice_id_pt: Optional[str] = None
    pedagogy_preset: Optional[str] = None
    avoid_superlative_questions: Optional[bool] = None
    one_question_per_turn: Optional[bool] = None
    voice_speed: Optional[int] = None
    voice_stability: Optional[int] = None
    voice_style: Optional[int] = None
    icon_bg: Optional[str] = None
    status: Optional[str] = None

    # v3
    response_length: Optional[str] = None
    tutor_talk_ratio: Optional[int] = None
    proactive_questions: Optional[bool] = None
    tutor_shares_opinions: Optional[bool] = None
    warmth_level: Optional[int] = None
    correction_mode: Optional[str] = None
    correction_focus: Optional[list[str]] = None
    error_threshold: Optional[str] = None
    max_feedback_items: Optional[int] = None
    praise_count: Optional[int] = None
    report_include_summary: Optional[bool] = None
    report_include_connectors: Optional[bool] = None
    report_include_vocab_suggestions: Optional[bool] = None
    report_include_pronunciation: Optional[bool] = None
    report_include_next_session_tip: Optional[bool] = None
    opening_style: Optional[str] = None
    opening_includes_topic_intro: Optional[bool] = None
    silence_tolerance_ms: Optional[int] = None
    interruption_allowed: Optional[bool] = None
    scaffold_when_stuck: Optional[bool] = None
    segmento: Optional[str] = None
    enfoque: Optional[str] = None
    curriculum_mode: Optional[str] = None
    identity_description: Optional[str] = None


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
    # Motor: a quién sirve el tópico (lo usa el sequencer para filtrar por banda).
    audience: str = "adult"                              # kid | adult
    segmento: Optional[str] = None                       # mini | junior | tween | adultos
    appropriate_bands: Optional[list[str]] = None        # [mini,junior,tween,adult] o null = sin restricción
    generated_vocab: Optional[list[str]] = None          # frases-ancla (batch, revisables)


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
    audience: Optional[str] = None
    segmento: Optional[str] = None
    appropriate_bands: Optional[list[str]] = None
    generated_vocab: Optional[list[str]] = None


class TopicResponse(TopicBase):
    id: int
    usage_count: int = 0

    class Config:
        from_attributes = True


# ─── Sessions ───────────────────────────────────────────────────────────────

class SessionStartRequest(BaseModel):
    topic_id: Optional[int] = None
    template_id: Optional[int] = None
    free_topic: Optional[str] = None


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
