package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// SettingsHandler handles settings-related requests.
type SettingsHandler struct {
	svc *service.SettingsService
}

// NewSettingsHandler creates a new SettingsHandler.
func NewSettingsHandler(svc *service.SettingsService) *SettingsHandler {
	return &SettingsHandler{svc: svc}
}

// ListSettings returns all app settings.
//
//	@ID			listSettings
//	@Summary	List app settings
//	@Tags		settings
//	@Produce	json
//	@Success	200	{object}	DataWrapper{data=[]SettingResponse}
//	@Router		/api/v1/settings [get]
func (h *SettingsHandler) ListSettings(c *gin.Context) {
	settings, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(settings, toSettingResponse)})
}

// UpdateSetting updates a single setting value.
//
//	@ID			updateSetting
//	@Summary	Update a setting
//	@Tags		settings
//	@Accept		json
//	@Produce	json
//	@Param		key		path		string					true	"Setting key"
//	@Param		body	body		UpdateSettingRequest	true	"Setting value"
//	@Success	200		{object}	StatusResponse
//	@Failure	404		{object}	ErrorResponse
//	@Router		/api/v1/settings/{key} [put]
func (h *SettingsHandler) UpdateSetting(c *gin.Context) {
	key := c.Param("key")

	var input UpdateSettingRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.svc.Update(c.Request.Context(), key, input.Value); err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}

func toSettingResponse(s *service.Setting) SettingResponse {
	return SettingResponse{
		Key:         s.Key,
		Value:       s.Value,
		IsSecret:    s.IsSecret,
		Description: s.Description,
		Configured:  s.Configured,
		UpdatedAt:   s.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
}
