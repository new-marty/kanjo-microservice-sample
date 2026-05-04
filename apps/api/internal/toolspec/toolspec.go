// Package toolspec converts an embedded OpenAPI 3 spec into LLM tool manifests
// (OpenAI and Anthropic shapes). Each tool's description is suffixed with
// "Invoke: METHOD /path" so an LLM can dispatch directly to the existing REST
// route — there is no separate /tools/call handler.
package toolspec

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
)

type tool struct {
	Name        string
	Description string
	Schema      map[string]any
}

// Build parses the OpenAPI YAML and returns OpenAI-shaped and Anthropic-shaped
// tool manifests as pretty-printed JSON. Operations whose 2xx response looks
// like a streaming endpoint (text/event-stream content-type or "stream"/"sse"
// in the description) are filtered out.
func Build(yamlSpec []byte) (openaiBytes, anthropicBytes []byte, err error) {
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(yamlSpec)
	if err != nil {
		return nil, nil, fmt.Errorf("load openapi spec: %w", err)
	}
	if doc.Paths == nil {
		return nil, nil, fmt.Errorf("openapi spec has no paths")
	}

	var tools []tool
	for path, item := range doc.Paths.Map() {
		if item == nil {
			continue
		}
		for method, op := range item.Operations() {
			if op == nil || op.OperationID == "" {
				continue
			}
			if isStreaming(op) {
				continue
			}
			t, err := buildTool(method, path, op)
			if err != nil {
				return nil, nil, fmt.Errorf("%s %s: %w", method, path, err)
			}
			tools = append(tools, t)
		}
	}

	sort.Slice(tools, func(i, j int) bool { return tools[i].Name < tools[j].Name })

	openaiList := make([]map[string]any, 0, len(tools))
	anthList := make([]map[string]any, 0, len(tools))
	for _, t := range tools {
		openaiList = append(openaiList, map[string]any{
			"type": "function",
			"function": map[string]any{
				"name":        t.Name,
				"description": t.Description,
				"parameters":  t.Schema,
			},
		})
		anthList = append(anthList, map[string]any{
			"name":         t.Name,
			"description":  t.Description,
			"input_schema": t.Schema,
		})
	}

	openaiBytes, err = json.MarshalIndent(map[string]any{"tools": openaiList}, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("marshal openai tools: %w", err)
	}
	anthropicBytes, err = json.MarshalIndent(map[string]any{"tools": anthList}, "", "  ")
	if err != nil {
		return nil, nil, fmt.Errorf("marshal anthropic tools: %w", err)
	}
	return openaiBytes, anthropicBytes, nil
}

func isStreaming(op *openapi3.Operation) bool {
	if op.Responses == nil {
		return false
	}
	for _, status := range []string{"200", "201", "202"} {
		rref := op.Responses.Value(status)
		if rref == nil || rref.Value == nil {
			continue
		}
		r := rref.Value
		if r.Description != nil {
			d := strings.ToLower(*r.Description)
			if strings.Contains(d, "stream") || strings.Contains(d, "sse") {
				return true
			}
		}
		if _, ok := r.Content["text/event-stream"]; ok {
			return true
		}
	}
	return false
}

func buildTool(method, path string, op *openapi3.Operation) (tool, error) {
	desc := op.Summary
	if op.Description != "" {
		if desc != "" {
			desc += "\n\n"
		}
		desc += op.Description
	}
	if desc != "" {
		desc += "\n\n"
	}
	desc += "Invoke: " + strings.ToUpper(method) + " " + path

	properties := map[string]any{}
	required := []string{}
	seen := map[string]bool{}

	for _, pref := range op.Parameters {
		if pref == nil || pref.Value == nil {
			continue
		}
		p := pref.Value
		if p.In != "path" && p.In != "query" {
			continue
		}
		schemaJSON, err := schemaToJSON(p.Schema)
		if err != nil {
			return tool{}, fmt.Errorf("param %q: %w", p.Name, err)
		}
		if p.Description != "" {
			if m, ok := schemaJSON.(map[string]any); ok && m["description"] == nil {
				m["description"] = p.Description
			}
		}
		properties[p.Name] = schemaJSON
		seen[p.Name] = true
		if p.In == "path" || p.Required {
			required = append(required, p.Name)
		}
	}

	if op.RequestBody != nil && op.RequestBody.Value != nil {
		if mt := op.RequestBody.Value.Content.Get("application/json"); mt != nil && mt.Schema != nil && mt.Schema.Value != nil {
			sch := mt.Schema.Value
			rename := map[string]string{}
			for propName, propRef := range sch.Properties {
				key := propName
				if seen[key] {
					key = "body_" + key
				}
				rename[propName] = key
				seen[key] = true
				schemaJSON, err := schemaToJSON(propRef)
				if err != nil {
					return tool{}, fmt.Errorf("body field %q: %w", propName, err)
				}
				properties[key] = schemaJSON
			}
			for _, req := range sch.Required {
				if mapped, ok := rename[req]; ok {
					required = append(required, mapped)
				}
			}
		}
	}

	sort.Strings(required)

	schema := map[string]any{
		"type":       "object",
		"properties": properties,
	}
	if len(required) > 0 {
		schema["required"] = required
	}

	return tool{Name: op.OperationID, Description: desc, Schema: schema}, nil
}

func schemaToJSON(ref *openapi3.SchemaRef) (any, error) {
	if ref == nil || ref.Value == nil {
		return map[string]any{}, nil
	}
	b, err := json.Marshal(ref.Value)
	if err != nil {
		return nil, err
	}
	var out any
	if err := json.Unmarshal(b, &out); err != nil {
		return nil, err
	}
	return out, nil
}
