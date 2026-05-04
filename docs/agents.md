# AI Agent Integration

Kanjo's REST API is callable as **tools / function calls** by any LLM agent — no MCP server required. The OpenAPI spec is the single source of truth; at startup, the server converts it into per-vendor tool manifests and serves them at well-known URLs.

## Endpoints

| URL                         | Shape                                         |
| --------------------------- | --------------------------------------------- |
| `GET /openapi.json`         | OpenAPI 3 spec                                |
| `GET /tools/openai.json`    | OpenAI `{type:"function", function:{...}}`    |
| `GET /tools/anthropic.json` | Anthropic `{name, description, input_schema}` |

Each tool's `description` ends with a line like:

```
Invoke: GET /api/v1/transactions/{hash}
```

The agent reads that line, fills `{path}` placeholders from its tool input, and calls the existing REST route directly. There is **no `/tools/call` dispatcher** — one source of truth, no parallel handlers.

## CLI

```bash
kanjo openapi              # GET /openapi.json
kanjo tools openai         # GET /tools/openai.json
kanjo tools anthropic      # GET /tools/anthropic.json
```

## Anthropic SDK example

```python
import json, re, requests
import anthropic

API = "http://localhost:8080"
manifest = requests.get(f"{API}/tools/anthropic.json").json()
tools = manifest["tools"]
tools_by_name = {t["name"]: t for t in tools}

def dispatch(tool_name: str, tool_input: dict) -> str:
    tool = tools_by_name[tool_name]
    method, path = re.search(r"Invoke:\s+(\w+)\s+(\S+)", tool["description"]).groups()
    # Fill {path} placeholders, leftover args become query/body.
    placeholders = re.findall(r"\{(\w+)\}", path)
    for k in placeholders:
        path = path.replace(f"{{{k}}}", str(tool_input.pop(k)))
    if method == "GET":
        r = requests.get(API + path, params=tool_input, timeout=30)
    else:
        r = requests.request(method, API + path, json=tool_input, timeout=30)
    r.raise_for_status()
    return r.text

client = anthropic.Anthropic()
messages = [{"role": "user", "content": "Show me my last 5 transactions."}]

while True:
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        tools=tools,
        messages=messages,
    )
    if resp.stop_reason != "tool_use":
        print(resp.content[0].text)
        break
    messages.append({"role": "assistant", "content": resp.content})
    tool_results = []
    for block in resp.content:
        if block.type == "tool_use":
            result = dispatch(block.name, dict(block.input))
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result,
            })
    messages.append({"role": "user", "content": tool_results})
```

## OpenAI SDK example

```python
import json, re, requests
from openai import OpenAI

API = "http://localhost:8080"
manifest = requests.get(f"{API}/tools/openai.json").json()
tools = manifest["tools"]
tools_by_name = {t["function"]["name"]: t["function"] for t in tools}

def dispatch(name: str, args: dict) -> str:
    fn = tools_by_name[name]
    method, path = re.search(r"Invoke:\s+(\w+)\s+(\S+)", fn["description"]).groups()
    for k in re.findall(r"\{(\w+)\}", path):
        path = path.replace(f"{{{k}}}", str(args.pop(k)))
    if method == "GET":
        r = requests.get(API + path, params=args, timeout=30)
    else:
        r = requests.request(method, API + path, json=args, timeout=30)
    r.raise_for_status()
    return r.text

client = OpenAI()
messages = [{"role": "user", "content": "Show me my last 5 transactions."}]

while True:
    resp = client.chat.completions.create(
        model="gpt-4o-mini", tools=tools, messages=messages,
    )
    msg = resp.choices[0].message
    messages.append(msg)
    if not msg.tool_calls:
        print(msg.content)
        break
    for tc in msg.tool_calls:
        out = dispatch(tc.function.name, json.loads(tc.function.arguments))
        messages.append({"role": "tool", "tool_call_id": tc.id, "content": out})
```

## Notes

- The SSE `/api/v1/chat` endpoint is filtered out of both manifests — synchronous tool calls can't consume a stream.
- Body fields whose names collide with path/query parameters are prefixed `body_` in the schema.
- Manifests are byte-identical across requests (cached at startup); `Cache-Control: public, max-age=300` is set.
- No auth today (single-user / localhost). When that changes, the runner needs a one-line `Authorization: Bearer ...` addition.
