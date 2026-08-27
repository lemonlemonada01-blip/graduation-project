from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


JSONDict = Dict[str, Any]
ApprovalCallback = Callable[[str, JSONDict], bool]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    parameters: JSONDict
    requires_approval: bool = True

    def as_openrouter_tool(self) -> JSONDict:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


@dataclass
class ToolResult:
    ok: bool
    output: Any
    error: Optional[str] = None
    metadata: JSONDict = field(default_factory=dict)

    def as_model_content(self) -> str:
        import json

        payload = {
            "ok": self.ok,
            "output": self.output,
            "error": self.error,
            "metadata": self.metadata,
        }
        return json.dumps(payload, ensure_ascii=False, default=str)


@dataclass
class AgentConfig:
    model: str = "openrouter/free"
    fallback_models: List[str] = field(default_factory=list)
    max_iterations: int = 12
    max_tokens: int = 1800
    tool_output_limit: int = 12000
    command_timeout: int = 30
    workspace: str = "./workspace"
    state_dir: str = "./.agent_state"
    temperature: float = 0.2


@dataclass
class AgentRun:
    run_id: str
    task: str
    model: str
    plan: JSONDict = field(default_factory=dict)
    final_answer: str = ""
    iterations: int = 0
    status: str = "running"
