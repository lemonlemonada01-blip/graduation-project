from __future__ import annotations

import time
from typing import Any, Dict, Iterable, List, Optional

import requests


class OpenRouterError(RuntimeError):
    pass


class OpenRouterGateway:
    """Small dependency-light client for OpenRouter's OpenAI-compatible API."""

    def __init__(
        self,
        api_key: str,
        model: str = "openrouter/free",
        fallback_models: Optional[Iterable[str]] = None,
        site_url: str = "http://localhost",
        app_name: str = "Local OpenRouter Agent",
        timeout: int = 90,
        session: Optional[requests.Session] = None,
    ) -> None:
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is required")
        self.api_key = api_key
        self.model = model
        self.fallback_models = [m for m in (fallback_models or []) if m]
        self.base_url = "https://openrouter.ai/api/v1"
        self.timeout = timeout
        self.session = session or requests.Session()
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": site_url,
            "X-OpenRouter-Title": app_name,
        }

    def complete(
        self,
        messages: List[Dict[str, Any]],
        tools: Optional[List[Dict[str, Any]]] = None,
        model: Optional[str] = None,
        max_tokens: int = 1800,
        temperature: float = 0.2,
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Send one completion request and return the normalized response JSON."""
        chosen_models = [model or self.model] + self.fallback_models
        last_error: Optional[Exception] = None
        for candidate in dict.fromkeys(chosen_models):
            payload: Dict[str, Any] = {
                "model": candidate,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": False,
            }
            if tools:
                payload["tools"] = tools
                payload["tool_choice"] = "auto"
            if session_id:
                payload["session_id"] = session_id
            try:
                response = self.session.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json=payload,
                    timeout=self.timeout,
                )
                if response.status_code in {408, 429, 500, 502, 503, 524, 529}:
                    raise OpenRouterError(
                        f"transient OpenRouter error {response.status_code}: {response.text[:500]}"
                    )
                if response.status_code >= 400:
                    raise OpenRouterError(
                        f"OpenRouter error {response.status_code}: {response.text[:1000]}"
                    )
                data = response.json()
                if not data.get("choices"):
                    raise OpenRouterError("OpenRouter returned no choices")
                return data
            except (requests.RequestException, ValueError, OpenRouterError) as exc:
                last_error = exc
                # A fallback model is useful for free-provider outages. Do not spin
                # aggressively when a provider is temporarily rate limited.
                if candidate != chosen_models[-1]:
                    time.sleep(0.6)
        raise OpenRouterError(str(last_error or "OpenRouter request failed"))

    def list_models(self, require_tools: bool = False) -> List[Dict[str, Any]]:
        params: Dict[str, str] = {"output_modalities": "text"}
        if require_tools:
            params["supported_parameters"] = "tools"
        response = self.session.get(
            f"{self.base_url}/models",
            headers=self.headers,
            params=params,
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            raise OpenRouterError(
                f"OpenRouter models error {response.status_code}: {response.text[:1000]}"
            )
        data = response.json()
        return data.get("data", [])

    def list_free_models(self, require_tools: bool = False) -> List[Dict[str, Any]]:
        models = self.list_models(require_tools=require_tools)

        def is_zero(value: Any) -> bool:
            try:
                return float(value or 0) == 0.0
            except (TypeError, ValueError):
                return False

        free: List[Dict[str, Any]] = []
        for item in models:
            pricing = item.get("pricing") or {}
            if all(is_zero(pricing.get(key)) for key in ("prompt", "completion", "request")):
                free.append(item)
        return free

    def choose_free_model(self, require_tools: bool = True) -> str:
        """Choose a catalog model while retaining the dynamic free router fallback."""
        try:
            candidates = self.list_free_models(require_tools=require_tools)
        except OpenRouterError:
            return "openrouter/free"
        if not candidates:
            return "openrouter/free"
        # Prefer larger context windows, then stable-looking canonical IDs.
        candidates.sort(
            key=lambda item: (
                int(item.get("context_length") or 0),
                "latest" in str(item.get("id", "")),
            ),
            reverse=True,
        )
        return str(candidates[0]["id"])

    @staticmethod
    def assistant_message(response: Dict[str, Any]) -> Dict[str, Any]:
        message = response["choices"][0].get("message") or {}
        normalized: Dict[str, Any] = {
            "role": "assistant",
            "content": message.get("content"),
        }
        if message.get("tool_calls"):
            normalized["tool_calls"] = message["tool_calls"]
        if message.get("reasoning"):
            normalized["reasoning"] = message["reasoning"]
        return normalized

    @staticmethod
    def usage(response: Dict[str, Any]) -> Dict[str, Any]:
        return response.get("usage") or {}
