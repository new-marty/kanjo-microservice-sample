package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// InsightHandler handles insight-related requests.
type InsightHandler struct {
	svc *service.InsightService
}

// NewInsightHandler creates a new InsightHandler.
func NewInsightHandler(svc *service.InsightService) *InsightHandler {
	return &InsightHandler{svc: svc}
}

// ListInsights returns active AI insights.
//
//	@ID			listInsights
//	@Summary	List insights
//	@Tags		insights
//	@Produce	json
//	@Param		limit	query		int	false	"Number of results"	default(10)
//	@Success	200		{object}	DataWrapper{data=[]InsightResponse}
//	@Router		/api/v1/insights [get]
func (h *InsightHandler) ListInsights(c *gin.Context) {
	limit := int32(10)
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = int32(l)
		}
	}

	insights, err := h.svc.List(c.Request.Context(), limit)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(insights, toInsightResponse)})
}

// DismissInsight marks an insight as dismissed.
//
//	@ID			dismissInsight
//	@Summary	Dismiss insight
//	@Tags		insights
//	@Produce	json
//	@Param		id	path		int	true	"Insight ID"
//	@Success	200	{object}	StatusResponse
//	@Router		/api/v1/insights/{id}/dismiss [post]
func (h *InsightHandler) DismissInsight(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	err = h.svc.Dismiss(c.Request.Context(), id)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}
