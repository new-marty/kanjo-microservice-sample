package toolspec

import (
	"encoding/json"
	"strings"
	"testing"

	apispec "github.com/new-marty/kanjo/api"
)

const fixtureSpec = `
openapi: 3.0.3
info:
  title: Fixture
  version: 0.0.0
paths:
  /api/v1/transactions/{hash}:
    get:
      operationId: getTransaction
      summary: Get a transaction
      parameters:
        - name: hash
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
  /api/v1/transactions:
    get:
      operationId: listTransactions
      summary: List transactions
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
          description: Max results
        - name: search
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
  /api/v1/budgets:
    put:
      operationId: upsertBudget
      summary: Create or update budget
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [category_name, monthly_budget]
              properties:
                category_name:
                  type: string
                monthly_budget:
                  type: integer
      responses:
        "200":
          description: OK
  /api/v1/chat:
    post:
      operationId: chat
      summary: Chat
      responses:
        "200":
          description: SSE stream
`

func TestBuild_FixtureProducesExpectedTools(t *testing.T) {
	openaiBytes, anthBytes, err := Build([]byte(fixtureSpec))
	if err != nil {
		t.Fatalf("Build: %v", err)
	}

	var openai map[string]any
	if err := json.Unmarshal(openaiBytes, &openai); err != nil {
		t.Fatalf("unmarshal openai: %v", err)
	}
	openaiTools := openai["tools"].([]any)
	if len(openaiTools) != 3 {
		t.Fatalf("openai: expected 3 tools (chat filtered), got %d", len(openaiTools))
	}

	var anth map[string]any
	if err := json.Unmarshal(anthBytes, &anth); err != nil {
		t.Fatalf("unmarshal anthropic: %v", err)
	}
	anthTools := anth["tools"].([]any)
	if len(anthTools) != 3 {
		t.Fatalf("anthropic: expected 3 tools (chat filtered), got %d", len(anthTools))
	}

	// Sorted by name: getTransaction, listTransactions, upsertBudget
	names := []string{}
	for _, raw := range anthTools {
		t := raw.(map[string]any)
		names = append(names, t["name"].(string))
	}
	wantNames := []string{"getTransaction", "listTransactions", "upsertBudget"}
	for i, n := range wantNames {
		if names[i] != n {
			t.Errorf("name[%d]: want %s, got %s", i, n, names[i])
		}
	}

	// Each description should end with the Invoke: line.
	for _, raw := range anthTools {
		tt := raw.(map[string]any)
		desc := tt["description"].(string)
		if !strings.Contains(desc, "Invoke: ") {
			t.Errorf("tool %s missing Invoke: line: %s", tt["name"], desc)
		}
	}

	// getTransaction: hash is required path param.
	getTx := anthTools[0].(map[string]any)
	if !strings.Contains(getTx["description"].(string), "GET /api/v1/transactions/{hash}") {
		t.Errorf("getTransaction Invoke line wrong: %v", getTx["description"])
	}
	schema := getTx["input_schema"].(map[string]any)
	required := schema["required"].([]any)
	if len(required) != 1 || required[0].(string) != "hash" {
		t.Errorf("getTransaction required: %v", required)
	}

	// listTransactions: search is required (in:query, required:true), limit isn't.
	listTx := anthTools[1].(map[string]any)
	listReq := listTx["input_schema"].(map[string]any)["required"].([]any)
	gotReq := map[string]bool{}
	for _, r := range listReq {
		gotReq[r.(string)] = true
	}
	if !gotReq["search"] {
		t.Errorf("listTransactions: 'search' should be required, got %v", listReq)
	}
	if gotReq["limit"] {
		t.Errorf("listTransactions: 'limit' should NOT be required, got %v", listReq)
	}

	// upsertBudget: body fields flattened.
	upsert := anthTools[2].(map[string]any)
	props := upsert["input_schema"].(map[string]any)["properties"].(map[string]any)
	if _, ok := props["category_name"]; !ok {
		t.Errorf("upsertBudget: missing 'category_name' in properties")
	}
	if _, ok := props["monthly_budget"]; !ok {
		t.Errorf("upsertBudget: missing 'monthly_budget' in properties")
	}
	upsertReq := upsert["input_schema"].(map[string]any)["required"].([]any)
	gotUpsertReq := map[string]bool{}
	for _, r := range upsertReq {
		gotUpsertReq[r.(string)] = true
	}
	if !gotUpsertReq["category_name"] || !gotUpsertReq["monthly_budget"] {
		t.Errorf("upsertBudget required missing body fields: %v", upsertReq)
	}

	// OpenAI shape sanity: each tool wrapped with type:function.
	first := openaiTools[0].(map[string]any)
	if first["type"] != "function" {
		t.Errorf("openai tool[0].type = %v, want 'function'", first["type"])
	}
	fn := first["function"].(map[string]any)
	if _, ok := fn["parameters"]; !ok {
		t.Errorf("openai tool[0].function missing 'parameters'")
	}
}

func TestBuild_AgainstEmbeddedSpec(t *testing.T) {
	openai, anth, err := Build(apispec.OpenAPIYAML)
	if err != nil {
		t.Fatalf("Build against embedded spec: %v", err)
	}
	var openaiDoc, anthDoc map[string]any
	if err := json.Unmarshal(openai, &openaiDoc); err != nil {
		t.Fatalf("unmarshal openai: %v", err)
	}
	if err := json.Unmarshal(anth, &anthDoc); err != nil {
		t.Fatalf("unmarshal anth: %v", err)
	}
	openaiTools := openaiDoc["tools"].([]any)
	anthTools := anthDoc["tools"].([]any)
	if len(openaiTools) == 0 || len(anthTools) == 0 {
		t.Fatalf("expected non-empty tool lists, got openai=%d anth=%d", len(openaiTools), len(anthTools))
	}
	if len(openaiTools) != len(anthTools) {
		t.Fatalf("openai (%d) and anthropic (%d) tool counts diverge", len(openaiTools), len(anthTools))
	}
	// Spot-check: the SSE chat endpoint should be filtered out.
	for _, raw := range anthTools {
		tt := raw.(map[string]any)
		if tt["name"] == "chat" {
			t.Errorf("chat (SSE) tool should have been filtered out")
		}
		if !strings.Contains(tt["description"].(string), "Invoke: ") {
			t.Errorf("tool %v description missing Invoke: suffix", tt["name"])
		}
	}
	t.Logf("embedded spec produced %d tools", len(anthTools))
}

func TestBuild_FiltersStreamingByContentType(t *testing.T) {
	spec := `
openapi: 3.0.3
info:
  title: f
  version: "0.0.0"
paths:
  /stream:
    get:
      operationId: streamThing
      summary: Stream
      responses:
        "200":
          description: OK
          content:
            text/event-stream: {}
  /normal:
    get:
      operationId: getThing
      summary: Get
      responses:
        "200":
          description: OK
`
	_, anth, err := Build([]byte(spec))
	if err != nil {
		t.Fatalf("Build: %v", err)
	}
	var doc map[string]any
	_ = json.Unmarshal(anth, &doc)
	tools := doc["tools"].([]any)
	if len(tools) != 1 {
		t.Fatalf("expected 1 tool (streamThing filtered), got %d", len(tools))
	}
	if tools[0].(map[string]any)["name"] != "getThing" {
		t.Errorf("kept wrong tool: %v", tools[0])
	}
}
