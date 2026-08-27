from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path
from typing import Any, Callable, Dict, Iterable, List, Optional

from .types import ApprovalCallback, JSONDict, ToolResult, ToolSpec


class Workspace:
    def __init__(self, root: str, output_limit: int = 12000, command_timeout: int = 30) -> None:
        self.root = Path(root).expanduser().resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        self.output_limit = output_limit
        self.command_timeout = command_timeout

    def resolve(self, path: str) -> Path:
        candidate = Path(path)
        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            resolved = (self.root / candidate).resolve()
        try:
            resolved.relative_to(self.root)
        except ValueError as exc:
            raise ValueError(f"path escapes workspace: {path}") from exc
        return resolved

    def relative(self, path: Path) -> str:
        return str(path.relative_to(self.root)) or "."

    def _clip(self, value: str) -> str:
        if len(value) <= self.output_limit:
            return value
        return value[: self.output_limit] + f"\n... truncated at {self.output_limit} characters"

    def list_files(self, path: str = ".") -> ToolResult:
        try:
            base = self.resolve(path)
            if not base.exists():
                return ToolResult(False, None, f"not found: {path}")
            if base.is_file():
                return ToolResult(True, [self.relative(base)])
            items: List[str] = []
            for item in sorted(base.rglob("*")):
                if any(part in {".git", ".agent_state", ".venv", "node_modules"} for part in item.parts):
                    continue
                items.append(self.relative(item) + ("/" if item.is_dir() else ""))
                if len(items) >= 500:
                    break
            return ToolResult(True, items)
        except (OSError, ValueError) as exc:
            return ToolResult(False, None, str(exc))

    def read_file(self, path: str, start_line: int = 1, end_line: int = 250) -> ToolResult:
        try:
            target = self.resolve(path)
            if not target.is_file():
                return ToolResult(False, None, f"not a file: {path}")
            if start_line < 1 or end_line < start_line:
                return ToolResult(False, None, "invalid line range")
            lines = target.read_text(encoding="utf-8", errors="replace").splitlines()
            selected = lines[start_line - 1 : end_line]
            numbered = "\n".join(f"{idx}: {line}" for idx, line in enumerate(selected, start=start_line))
            return ToolResult(True, self._clip(numbered), metadata={"path": self.relative(target), "total_lines": len(lines)})
        except (OSError, ValueError) as exc:
            return ToolResult(False, None, str(exc))

    def write_file(self, path: str, content: str) -> ToolResult:
        try:
            target = self.resolve(path)
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content, encoding="utf-8")
            return ToolResult(True, {"path": self.relative(target), "bytes": target.stat().st_size})
        except (OSError, ValueError) as exc:
            return ToolResult(False, None, str(exc))

    def search_text(self, query: str, path: str = ".", regex: bool = False) -> ToolResult:
        try:
            base = self.resolve(path)
            pattern = re.compile(query) if regex else None
            matches: List[Dict[str, Any]] = []
            candidates = [base] if base.is_file() else base.rglob("*")
            for item in candidates:
                if not item.is_file() or any(part in {".git", ".agent_state", ".venv", "node_modules"} for part in item.parts):
                    continue
                try:
                    lines = item.read_text(encoding="utf-8", errors="replace").splitlines()
                except OSError:
                    continue
                for number, line in enumerate(lines, start=1):
                    found = bool(pattern.search(line)) if pattern else query.lower() in line.lower()
                    if found:
                        matches.append({"path": self.relative(item), "line": number, "text": line[:500]})
                        if len(matches) >= 200:
                            return ToolResult(True, matches, metadata={"truncated": True})
            return ToolResult(True, matches)
        except (OSError, ValueError, re.error) as exc:
            return ToolResult(False, None, str(exc))

    def run_shell(self, command: str, timeout: Optional[int] = None) -> ToolResult:
        blocked = [
            r"(^|\s)rm\s+-rf\s+(/|\$HOME|~)",
            r"(^|\s)mkfs(\s|$)",
            r"(^|\s)dd\s+.*of=/dev/",
            r":\(\)\s*\{",
            r"curl\s+[^\n|]*\|\s*(ba)?sh",
            r"wget\s+[^\n|]*\|\s*(ba)?sh",
            r"(^|\s)sudo\s+",
        ]
        if any(re.search(pattern, command, flags=re.IGNORECASE) for pattern in blocked):
            return ToolResult(False, None, "command rejected by local safety policy")
        safe_env = {key: value for key, value in os.environ.items() if "KEY" not in key.upper() and "TOKEN" not in key.upper() and "PASSWORD" not in key.upper()}
        try:
            completed = subprocess.run(
                command,
                shell=True,
                cwd=self.root,
                executable="/bin/bash",
                capture_output=True,
                text=True,
                timeout=timeout or self.command_timeout,
                env=safe_env,
            )
            output = (completed.stdout or "")
            if completed.stderr:
                output += ("\nSTDERR:\n" if output else "STDERR:\n") + completed.stderr
            return ToolResult(
                completed.returncode == 0,
                self._clip(output.rstrip()),
                None if completed.returncode == 0 else f"exit code {completed.returncode}",
                {"returncode": completed.returncode},
            )
        except subprocess.TimeoutExpired as exc:
            partial = (exc.stdout or "") if isinstance(exc.stdout, str) else ""
            return ToolResult(False, self._clip(partial), f"command timed out after {timeout or self.command_timeout}s")
        except OSError as exc:
            return ToolResult(False, None, str(exc))


class ToolRegistry:
    def __init__(self, workspace: Workspace, approval: Optional[ApprovalCallback] = None) -> None:
        self.workspace = workspace
        self.approval = approval or (lambda _name, _args: False)
        self._specs: Dict[str, ToolSpec] = {}
        self._handlers: Dict[str, Callable[..., ToolResult]] = {}
        self._register_defaults()

    def register(self, spec: ToolSpec, handler: Callable[..., ToolResult]) -> None:
        self._specs[spec.name] = spec
        self._handlers[spec.name] = handler

    def _register_defaults(self) -> None:
        obj = {"type": "object", "properties": {"path": {"type": "string"}}, "additionalProperties": False}
        self.register(ToolSpec("list_files", "List files and directories within the workspace.", obj, False), self.workspace.list_files)
        self.register(
            ToolSpec(
                "read_file",
                "Read a UTF-8 text file within the workspace with a bounded line range.",
                {"type": "object", "properties": {"path": {"type": "string"}, "start_line": {"type": "integer", "minimum": 1}, "end_line": {"type": "integer", "minimum": 1}}, "required": ["path"], "additionalProperties": False},
                False,
            ),
            self.workspace.read_file,
        )
        self.register(
            ToolSpec(
                "write_file",
                "Create or replace a UTF-8 text file within the workspace. Use only when the task requires a file change.",
                {"type": "object", "properties": {"path": {"type": "string"}, "content": {"type": "string"}}, "required": ["path", "content"], "additionalProperties": False},
                True,
            ),
            self.workspace.write_file,
        )
        self.register(
            ToolSpec(
                "search_text",
                "Search text files within the workspace. Set regex true only when a regular expression is needed.",
                {"type": "object", "properties": {"query": {"type": "string"}, "path": {"type": "string"}, "regex": {"type": "boolean"}}, "required": ["query"], "additionalProperties": False},
                False,
            ),
            self.workspace.search_text,
        )
        self.register(
            ToolSpec(
                "run_shell",
                "Run a shell command with the workspace as the current directory. Use it for tests, linters, and project inspection; do not use it for destructive actions or secrets.",
                {"type": "object", "properties": {"command": {"type": "string"}, "timeout": {"type": "integer", "minimum": 1, "maximum": 120}}, "required": ["command"], "additionalProperties": False},
                True,
            ),
            self.workspace.run_shell,
        )

    def openrouter_tools(self) -> List[JSONDict]:
        return [spec.as_openrouter_tool() for spec in self._specs.values()]

    def execute(self, name: str, arguments: JSONDict) -> ToolResult:
        spec = self._specs.get(name)
        handler = self._handlers.get(name)
        if not spec or not handler:
            return ToolResult(False, None, f"unknown tool: {name}")
        if spec.requires_approval and not self.approval(name, arguments):
            return ToolResult(False, None, "tool action denied by user approval policy")
        try:
            return handler(**arguments)
        except TypeError as exc:
            return ToolResult(False, None, f"invalid arguments for {name}: {exc}")
        except Exception as exc:  # Keep tool failures inside the model loop.
            return ToolResult(False, None, f"tool execution failed: {exc}")
