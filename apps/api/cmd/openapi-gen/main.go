package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/getkin/kin-openapi/openapi2"
	"github.com/getkin/kin-openapi/openapi2conv"
	swag "github.com/swaggo/swag/v2"
	sigsyaml "sigs.k8s.io/yaml"
)

//	@title		Kanjo API
//	@version	0.1.0
//	@description	Personal finance API wrapping MoneyForward ME data
//	@host		localhost:8080
//	@BasePath	/
//	@schemes	http

func main() {
	overrides := loadOverrides(".swaggo")

	// Redirect stdout to stderr during parsing to suppress swag's fmt.Println debug output
	origStdout := os.Stdout
	os.Stdout = os.Stderr

	p := swag.New(
		swag.SetParseDependency(3),
		swag.ParseUsingGoList(true),
		swag.SetDebugger(log.New(os.Stderr, "", log.LstdFlags)),
		swag.SetOverrides(overrides),
	)
	p.ParseInternal = true

	searchDirs := []string{
		"./cmd/openapi-gen",
		"./internal/handler",
		"./internal/service",
		"./internal/repository",
	}
	if err := p.ParseAPIMultiSearchDir(searchDirs, "main.go", 100); err != nil {
		log.Fatalf("parse: %v", err)
	}

	// Restore stdout
	os.Stdout = origStdout

	spec := p.GetSwagger()

	specJSON, err := json.Marshal(spec)
	if err != nil {
		log.Fatalf("marshal swagger: %v", err)
	}

	var doc2 openapi2.T
	if err := json.Unmarshal(specJSON, &doc2); err != nil {
		log.Fatalf("unmarshal swagger: %v", err)
	}

	doc3, err := openapi2conv.ToV3(&doc2)
	if err != nil {
		log.Fatalf("convert to v3: %v", err)
	}

	v3JSON, err := json.Marshal(doc3)
	if err != nil {
		log.Fatalf("marshal v3: %v", err)
	}

	yamlBytes, err := sigsyaml.JSONToYAML(v3JSON)
	if err != nil {
		log.Fatalf("json to yaml: %v", err)
	}

	if _, err = fmt.Fprint(os.Stdout, string(yamlBytes)); err != nil {
		log.Fatalf("write output: %v", err)
	}
}

func loadOverrides(path string) map[string]string {
	overrides := make(map[string]string)

	f, err := os.Open(path)
	if err != nil {
		return overrides
	}
	defer func() { _ = f.Close() }()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := scanner.Text()
		if strings.HasPrefix(line, "//") || strings.TrimSpace(line) == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) == 3 && parts[0] == "replace" {
			overrides[parts[1]] = parts[2]
		} else if len(parts) == 2 && parts[0] == "skip" {
			overrides[parts[1]] = ""
		}
	}

	return overrides
}
