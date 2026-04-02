package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// SyncHandler handles sync-related endpoints.
type SyncHandler struct {
	svc *service.SyncService
}

// NewSyncHandler creates a new SyncHandler.
func NewSyncHandler(svc *service.SyncService) *SyncHandler {
	return &SyncHandler{svc: svc}
}

// GetSyncStatus returns the last sync status.
//
//	@ID			getSyncStatus
//	@Summary	Get sync status
//	@Tags		sync
//	@Produce	json
//	@Success	200	{object}	SyncStatusResponse
//	@Router		/api/v1/sync/status [get]
func (h *SyncHandler) GetSyncStatus(c *gin.Context) {
	status, err := h.svc.GetStatus(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, SyncStatusResponse{
		LastSyncAt:              status.LastSyncAt,
		TransactionsProcessed:   status.TransactionsProcessed,
		TransactionsTransformed: status.TransactionsTransformed,
	})
}
