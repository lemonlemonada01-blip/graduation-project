from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from agentic_runtime.runtime import AgentRuntime
from agentic_runtime.store import EventStore
from agentic_runtime.tools import ToolRegistry, Workspace
from agentic_runtime.types import AgentConfig


class FakeGateway:
    def __init__(self) -> None:
        self.calls = []

    def complete(self, messages, tools=None, model=None, max_tokens=0, temperature=0, session_id=None):
        self.calls.append({"messages": messages, "tools": tools})
        if len(self.calls) == 1:
            return {"choices": [{"message": {"role": "assistant", "content": json.dumps({"objective": "inspect", "steps": [{"id": 1, "description": "list", "verification": "result"}], "done_when": ["answer"]})}}]}
        if len(self.calls) == 2:
            return {"choices": [{"message": {"role": "assistant", "content": None, "tool_calls": [{"id": "call-1", "type": "function", "function": {"name": "list_files", "arguments": "{\"path\": \".\"}"}}]}}]}
        return {"choices": [{"message": {"role": "assistant", "content": "Verified the workspace listing."}}]}

    @staticmethod
    def assistant_message(response):
        message = response["choices"][0]["message"]
        result = {"role": "assistant", "content": message.get("content")}
        if message.get("tool_calls"):
            result["tool_calls"] = message["tool_calls"]
        return result

    @staticmethod
    def usage(response):
        return {}


class AgentRuntimeTests(unittest.TestCase):
    def test_closed_loop_and_persistence(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "workspace"
            root.mkdir()
            (root / "hello.txt").write_text("hello", encoding="utf-8")
            gateway = FakeGateway()
            store = EventStore(str(Path(tmp) / "state"))
            tools = ToolRegistry(Workspace(str(root)), approval=lambda _name, _args: True)
            runtime = AgentRuntime(gateway, tools, store, AgentConfig(workspace=str(root), state_dir=str(Path(tmp) / "state"), max_iterations=4))
            result = runtime.run("Inspect the workspace")
            self.assertEqual(result.status, "completed")
            self.assertIn("Verified", result.final_answer)
            self.assertEqual(result.plan["objective"], "inspect")
            events = store.list_events(result.run_id)
            kinds = [event["kind"] for event in events]
            self.assertIn("plan_created", kinds)
            self.assertIn("tool_requested", kinds)
            self.assertIn("tool_completed", kinds)
            self.assertIn("run_finished", kinds)

    def test_workspace_rejects_escape(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Workspace(str(Path(tmp) / "workspace"))
            result = workspace.read_file("../../etc/passwd")
            self.assertFalse(result.ok)
            self.assertIn("escapes workspace", result.error or "")

    def test_shell_safety_and_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            workspace = Workspace(str(Path(tmp) / "workspace"))
            rejected = workspace.run_shell("rm -rf /")
            self.assertFalse(rejected.ok)
            safe = workspace.run_shell("printf 'ok'")
            self.assertTrue(safe.ok)
            self.assertEqual(safe.output, "ok")


if __name__ == "__main__":
    unittest.main()
