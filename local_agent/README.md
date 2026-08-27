# Local OpenRouter Agent

A local, inspectable agentic runtime for WSL. It uses OpenRouter-compatible chat completions and gives the model a controlled workspace, file tools, shell execution, persistent run history, planning, verification, and approval gates.

This is **not a copy of any proprietary internal system**. It is a practical approximation of the observable workflow: plan, act through tools, inspect results, verify, recover from errors, and report evidence.

## What it provides

| Capability | Implementation |
| --- | --- |
| Model access | OpenRouter `/api/v1/chat/completions` with retry handling |
| Free model use | `openrouter/free` by default, or automatic selection from the free catalog |
| Agent loop | Multi-turn tool calling with a configurable iteration limit |
| Workspace sandbox | File paths are restricted to the configured workspace |
| Tools | List files, read files, write files, search text, and run shell commands |
| Safety | Approval callback for writes and shell commands; dangerous shell patterns are blocked |
| Persistence | SQLite run/event history under `.agent_state/agent.db` |
| Planning | A structured plan is requested before execution, with a safe fallback |
| Verification | The model is instructed to test and inspect its own changes before finishing |
| Local execution | Designed for WSL/Linux; no cloud runtime is required |

## Requirements

- WSL 2 with Ubuntu or another recent Linux distribution.
- Python 3.10 or newer.
- An OpenRouter API key. Free models still have provider availability and rate limits; “free” does not mean unlimited or guaranteed uptime.

## Installation in WSL

```bash
cd /path/to/graduation-project/local_agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
nano .env
```

Set at least `OPENROUTER_API_KEY`. Keep `.env` private and do not commit it.

Run a task against the included workspace:

```bash
python -m agentic_runtime "Inspect the project and explain its main entry points"
```

Run with an explicit model:

```bash
python -m agentic_runtime "Add a small test for the parser and run it" \
  --model openrouter/free \
  --workspace ./workspace
```

Start an interactive session:

```bash
python -m agentic_runtime --interactive
```

The default approval mode asks before file writes and shell commands. For a disposable test workspace only, `--yes` automatically approves tool actions.

## Important boundaries

The agent can execute commands locally, so use a dedicated workspace and review approvals. It is intentionally not granted unrestricted access to your home directory. The runtime rejects path traversal, blocks several destructive command patterns, truncates tool output, and records events for inspection. These are useful safeguards, not a complete security boundary against a determined local administrator.

The model is an external service through OpenRouter. Do not place API keys, passwords, private documents, or other sensitive data in prompts or workspace files unless you accept the provider and model-routing implications.

## Architecture

```text
CLI
 └── AgentRuntime
      ├── Planner      -> asks the model for a bounded task plan
      ├── OpenRouterGateway
      │    ├── chat completions
      │    └── free model catalog discovery
      ├── ToolRegistry
      │    ├── workspace file operations
      │    └── approved shell execution
      └── SQLite EventStore
           ├── run metadata
           └── tool/model events
```

The orchestration loop is deliberately ordinary Python. You can replace the gateway, add tools, or integrate the runtime into another application without changing the core loop.

## Limitations compared with a hosted agent product

This local version does not automatically provide a browser session, proprietary retrieval systems, private connectors, multimodal perception, managed credentials, parallel subagents, or an always-on hosted service. Those can be added as explicit adapters, but they should not be treated as safe defaults. The `--interactive` CLI is the first interface; a web UI, background worker, and additional integrations can be layered on later.

## Tests

```bash
python -m unittest discover -s tests -v
```

The tests use a fake model gateway and do not consume OpenRouter requests.

## Official references

The gateway follows OpenRouter's documented chat-completion endpoint and tool-calling message format, and its optional model discovery uses the documented Models API filters for text output and tool support.[1] [2] [3]

[1]: https://openrouter.ai/docs/quickstart "OpenRouter Quickstart"
[2]: https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion "OpenRouter Chat Completions API"
[3]: https://openrouter.ai/docs/guides/features/tool-calling "OpenRouter Tool Calling"
[4]: https://openrouter.ai/docs/guides/overview/models "OpenRouter Models API"
