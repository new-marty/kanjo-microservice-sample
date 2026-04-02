package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// InstitutionHandler handles institution-related requests.
type InstitutionHandler struct {
	svc *service.InstitutionService
}

// NewInstitutionHandler creates a new InstitutionHandler.
func NewInstitutionHandler(svc *service.InstitutionService) *InstitutionHandler {
	return &InstitutionHandler{svc: svc}
}

// ListInstitutions returns linked financial institutions.
//
//	@ID			listInstitutions
//	@Summary	List institutions
//	@Tags		institutions
//	@Produce	json
//	@Success	200	{object}	DataWrapper{data=[]InstitutionResponse}
//	@Router		/api/v1/institutions [get]
func (h *InstitutionHandler) ListInstitutions(c *gin.Context) {
	institutions, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(institutions, toInstitutionResponse)})
}

// UpdateInstitution updates institution display settings.
//
//	@ID			updateInstitution
//	@Summary	Update institution
//	@Tags		institutions
//	@Accept		json
//	@Produce	json
//	@Param		name	path		string						true	"Institution name"
//	@Param		body	body		UpdateInstitutionRequest	true	"Institution data"
//	@Success	200		{object}	StatusResponse
//	@Router		/api/v1/institutions/{name} [patch]
func (h *InstitutionHandler) UpdateInstitution(c *gin.Context) {
	name := c.Param("name")

	var input UpdateInstitutionRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.svc.Update(c.Request.Context(), name, service.UpdateInstitutionInput{
		DisplayName: input.DisplayName,
		Icon:        input.Icon,
		Color:       input.Color,
		Hidden:      input.Hidden,
	})
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}
