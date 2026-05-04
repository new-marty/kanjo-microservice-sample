package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// SpecHandler serves the OpenAPI spec and the pre-built LLM tool manifests.
// These routes are intentionally NOT in the OpenAPI spec (no swag annotations) —
// otherwise they would appear as tools in their own manifests.
type SpecHandler struct {
	openapiJSON  []byte
	toolsOpenAI  []byte
	toolsAnthrop []byte
}

// NewSpecHandler captures the cached bytes built once at startup.
func NewSpecHandler(openapiJSON, toolsOpenAI, toolsAnthropic []byte) *SpecHandler {
	return &SpecHandler{
		openapiJSON:  openapiJSON,
		toolsOpenAI:  toolsOpenAI,
		toolsAnthrop: toolsAnthropic,
	}
}

func (h *SpecHandler) OpenAPI(c *gin.Context) {
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(http.StatusOK, "application/json", h.openapiJSON)
}

func (h *SpecHandler) ToolsOpenAI(c *gin.Context) {
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(http.StatusOK, "application/json", h.toolsOpenAI)
}

func (h *SpecHandler) ToolsAnthropic(c *gin.Context) {
	c.Header("Cache-Control", "public, max-age=300")
	c.Data(http.StatusOK, "application/json", h.toolsAnthrop)
}
