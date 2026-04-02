"""OpenRouter LLM provider implementation."""

import json
import logging
import re
from typing import Any, cast

import structlog
from openai import OpenAI
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from transform.llm.prompts import build_categorize_prompt, build_merchant_prompt
from transform.models import CategorizeOutput, Category, MerchantOutput

log = structlog.get_logger()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class LLMParseError(Exception):
    """Raised when LLM response cannot be parsed as JSON."""

    pass


class LLMEmptyResponseError(Exception):
    """Raised when LLM returns an empty response."""

    pass


def _extract_json(content: str) -> dict[str, Any]:
    """Extract JSON from LLM response.

    Handles:
    - Clean JSON
    - JSON in ```json code blocks
    - JSON with surrounding text
    """
    content = content.strip()

    # Try direct parse
    try:
        return cast(dict[str, Any], json.loads(content))
    except json.JSONDecodeError:
        pass

    # Try extracting from code block
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
    if match:
        try:
            return cast(dict[str, Any], json.loads(match.group(1)))
        except json.JSONDecodeError:
            pass

    # Try finding first {...}
    match = re.search(r"\{[^{}]*\}", content, re.DOTALL)
    if match:
        try:
            return cast(dict[str, Any], json.loads(match.group(0)))
        except json.JSONDecodeError:
            pass

    raise LLMParseError(f"Could not extract JSON: {content[:200]}")


class LLMProvider:
    """OpenRouter-based LLM provider using OpenAI-compatible API."""

    def __init__(self, api_key: str, model: str = "anthropic/claude-haiku-4.5"):
        self.client = OpenAI(
            api_key=api_key,
            base_url=OPENROUTER_BASE_URL,
        )
        self.model = model

    @retry(
        retry=retry_if_exception_type((LLMParseError, LLMEmptyResponseError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        before_sleep=before_sleep_log(log, logging.INFO),
        reraise=True,
    )
    def categorize(
        self,
        description: str,
        amount: int,
        mf_category: str,
        mf_sub_category: str | None,
        account_name: str,
        categories: list[Category],
    ) -> CategorizeOutput:
        """Categorize a transaction using LLM."""
        prompt = build_categorize_prompt(
            description=description,
            amount=amount,
            mf_category=mf_category,
            mf_sub_category=mf_sub_category,
            account_name=account_name,
            categories=categories,
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )

        content = response.choices[0].message.content
        if not content:
            raise LLMEmptyResponseError("Empty response from LLM")

        data = _extract_json(content)
        log.debug("LLM categorize response", data=data, model=self.model)

        return CategorizeOutput(
            category_id=data["categoryId"],
            confidence=data.get("confidence", 50),
            reasoning=data.get("reasoning"),
        )

    @retry(
        retry=retry_if_exception_type((LLMParseError, LLMEmptyResponseError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        before_sleep=before_sleep_log(log, logging.INFO),
        reraise=True,
    )
    def normalize_merchant(
        self,
        description: str,
        amount: int,
        category: str,
    ) -> MerchantOutput:
        """Normalize a merchant name using LLM."""
        prompt = build_merchant_prompt(
            description=description,
            amount=amount,
            category=category,
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=500,
        )

        content = response.choices[0].message.content
        if not content:
            raise LLMEmptyResponseError("Empty response from LLM")

        data = _extract_json(content)
        log.debug("LLM merchant response", data=data, model=self.model)

        return MerchantOutput(
            normalized_name=data["normalizedName"],
            display_name=data.get("displayName"),
            icon=data.get("icon"),
            confidence=data.get("confidence", 50),
        )
