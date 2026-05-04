// Package apispec embeds the Kanjo OpenAPI YAML spec and exposes it as bytes.
package apispec

import (
	_ "embed"
	"sync"

	"sigs.k8s.io/yaml"
)

//go:embed openapi.yaml
var OpenAPIYAML []byte

var (
	jsonOnce  sync.Once
	jsonBytes []byte
	jsonErr   error
)

// OpenAPIJSON returns the embedded spec converted to JSON, cached after first call.
func OpenAPIJSON() ([]byte, error) {
	jsonOnce.Do(func() {
		jsonBytes, jsonErr = yaml.YAMLToJSON(OpenAPIYAML)
	})
	return jsonBytes, jsonErr
}
