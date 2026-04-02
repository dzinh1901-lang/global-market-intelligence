"""Shared LLM helper used by all agents.

Mirrors the patterns in services/model_wrapper.py and services/brief_generator.py,
using the same flagship model identifiers.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
AGENT_MODEL = "gpt-5.4"


async def llm_chat(
    system_prompt: str,
    user_message: str,
    *,
    temperature: float = 0.4,
    max_tokens: int = 600,
    fallback: str = "",
    extra_messages: Optional[List[Dict]] = None,
) -> str:
    """Send a chat request to the LLM and return the assistant text.

    Falls back to *fallback* (or a generic note) when the API key is absent
    or the call fails, so agents always return usable output.
    """
    if not OPENAI_API_KEY:
        return fallback or f"[Agent response unavailable — OPENAI_API_KEY not configured]"
    try:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(api_key=OPENAI_API_KEY)
        messages: List[Dict] = [{"role": "system", "content": system_prompt}]
        if extra_messages:
            messages.extend(extra_messages)
        messages.append({"role": "user", "content": user_message})
        resp = await client.chat.completions.create(
            model=AGENT_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content or fallback
    except Exception as exc:
        logger.warning("llm_chat error: %s", exc)
        return fallback or "[Agent response temporarily unavailable. Please try again later.]"
