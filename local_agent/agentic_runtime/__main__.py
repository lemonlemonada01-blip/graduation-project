from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Any, Dict

try:
    from dotenv import load_dotenv
except ModuleNotFoundError:  # Keeps --help and local diagnostics usable before pip install.
    def load_dotenv(path: Path) -> None:
        if not path.exists():
            return
        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

from .gateway import OpenRouterGateway
from .runtime import AgentRuntime
from .store import EventStore
from .tools import ToolRegistry, Workspace
from .types import AgentConfig


def approval_prompt(name: str, args: Dict[str, Any]) -> bool:
    print(f"\nApproval required for {name}: {args}")
    answer = input("Approve? [y/N]: ").strip().lower()
    return answer in {"y", "yes"}


def load_runtime_settings(args: argparse.Namespace) -> tuple[Path, Path, str]:
    project_dir = Path(__file__).resolve().parents[1]
    load_dotenv(project_dir / ".env")
    state_dir = Path(args.state_dir or os.getenv("AGENT_STATE_DIR", "./.agent_state"))
    if not state_dir.is_absolute():
        state_dir = project_dir / state_dir
    model = args.model or os.getenv("OPENROUTER_MODEL", "openrouter/free")
    return project_dir, state_dir, model


def make_runtime(args: argparse.Namespace) -> AgentRuntime:
    project_dir, state_dir, model = load_runtime_settings(args)
    workspace = Path(args.workspace or os.getenv("AGENT_WORKSPACE", "./workspace"))
    if not workspace.is_absolute():
        workspace = project_dir / workspace
    fallbacks = [item.strip() for item in os.getenv("OPENROUTER_FALLBACK_MODELS", "").split(",") if item.strip()]
    config = AgentConfig(
        model=model,
        fallback_models=fallbacks,
        max_iterations=args.max_iterations or int(os.getenv("AGENT_MAX_ITERATIONS", "12")),
        max_tokens=int(os.getenv("AGENT_MAX_TOKENS", "1800")),
        tool_output_limit=int(os.getenv("AGENT_TOOL_OUTPUT_LIMIT", "12000")),
        command_timeout=int(os.getenv("AGENT_COMMAND_TIMEOUT", "30")),
        workspace=str(workspace),
        state_dir=str(state_dir),
    )
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    gateway = OpenRouterGateway(
        api_key=api_key,
        model=config.model,
        fallback_models=config.fallback_models,
        site_url=os.getenv("OPENROUTER_SITE_URL", "http://localhost"),
        app_name=os.getenv("OPENROUTER_APP_NAME", "Local OpenRouter Agent"),
    )
    workspace_obj = Workspace(config.workspace, config.tool_output_limit, config.command_timeout)
    tools = ToolRegistry(workspace_obj, approval=(lambda _name, _args: True) if args.yes else approval_prompt)
    return AgentRuntime(gateway, tools, EventStore(config.state_dir), config)


def run_one(runtime: AgentRuntime, task: str, args: argparse.Namespace) -> None:
    print(f"Starting run: {task}")
    result = runtime.run(task)
    print("\n=== PLAN ===")
    print(result.plan)
    print("\n=== RESULT ===")
    print(result.final_answer)
    print(f"\nRun ID: {result.run_id} | status: {result.status} | iterations: {result.iterations}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local OpenRouter agent with a controlled WSL workspace")
    parser.add_argument("task", nargs="*", help="Task to execute")
    parser.add_argument("--interactive", action="store_true", help="Start a multi-turn interactive session")
    parser.add_argument("--yes", action="store_true", help="Approve write/shell tools automatically; use only in a disposable workspace")
    parser.add_argument("--workspace", help="Workspace directory, restricted tool root")
    parser.add_argument("--state-dir", help="SQLite state directory")
    parser.add_argument("--model", help="OpenRouter model slug, default: openrouter/free")
    parser.add_argument("--max-iterations", type=int, help="Maximum model/tool loop iterations")
    parser.add_argument("--show-run", metavar="RUN_ID", help="Print a persisted run and its events without calling the model")
    parser.add_argument("--list-free-models", action="store_true", help="List currently available free text models from OpenRouter")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.show_run:
        _project_dir, state_dir, _model = load_runtime_settings(args)
        store = EventStore(str(state_dir))
        run = store.get_run(args.show_run)
        if not run:
            print(f"Run not found: {args.show_run}", file=sys.stderr)
            return 1
        print(run)
        print("\n=== EVENTS ===")
        for event in store.list_events(args.show_run):
            print(event)
        return 0
    if args.list_free_models:
        _project_dir, _state_dir, model = load_runtime_settings(args)
        api_key = os.getenv("OPENROUTER_API_KEY", "")
        try:
            gateway = OpenRouterGateway(api_key=api_key, model=model)
            models = gateway.list_free_models(require_tools=True)
            for item in models:
                print(f"{item.get('id')} | context={item.get('context_length')} | {item.get('name')}")
            return 0
        except Exception as exc:
            print(f"Model discovery failed: {exc}", file=sys.stderr)
            return 1
    if not args.task and not args.interactive:
        print("Provide a task or use --interactive. Example: python -m agentic_runtime 'inspect the workspace'", file=sys.stderr)
        return 2
    try:
        runtime = make_runtime(args)
    except Exception as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2
    if args.interactive:
        print("Interactive local agent. Press Ctrl-D or type 'exit' to quit.")
        while True:
            try:
                task = input("\nagent> ").strip()
            except EOFError:
                break
            if task.lower() in {"exit", "quit"}:
                break
            if task:
                run_one(runtime, task, args)
    else:
        run_one(runtime, " ".join(args.task), args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
