package handler

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// TransactionHandler handles transaction-related requests.
type TransactionHandler struct {
	svc *service.TransactionService
}

// NewTransactionHandler creates a new TransactionHandler.
func NewTransactionHandler(svc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

// ListTransactions returns transactions with optional filters.
//
//	@ID			listTransactions
//	@Summary	List transactions
//	@Tags		transactions
//	@Produce	json
//	@Param		limit		query		int		false	"Number of results"		default(50)
//	@Param		offset		query		int		false	"Offset for pagination"	default(0)
//	@Param		search		query		string	false	"Search query"
//	@Param		categories	query		[]string	false	"Comma-separated category IDs"
//	@Param		date_from	query		string	false	"Start date (YYYY-MM-DD)"
//	@Param		date_to		query		string	false	"End date (YYYY-MM-DD)"
//	@Param		reviewed	query		bool	false	"Filter by reviewed status"
//	@Success	200			{object}	TransactionListResponse
//	@Router		/api/v1/transactions [get]
func (h *TransactionHandler) ListTransactions(c *gin.Context) {
	params := service.ListParams{
		Limit:  50,
		Offset: 0,
	}

	// Parse pagination
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			params.Limit = int32(limit)
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if offset, err := strconv.Atoi(offsetStr); err == nil && offset >= 0 {
			params.Offset = int32(offset)
		}
	}

	// Parse filters
	if search := c.Query("search"); search != "" {
		params.Search = &search
	}
	if categories := c.Query("categories"); categories != "" {
		params.Categories = strings.Split(categories, ",")
	}
	if dateFrom := c.Query("date_from"); dateFrom != "" {
		if t, err := time.Parse("2006-01-02", dateFrom); err == nil {
			params.DateFrom = &t
		}
	}
	if dateTo := c.Query("date_to"); dateTo != "" {
		if t, err := time.Parse("2006-01-02", dateTo); err == nil {
			params.DateTo = &t
		}
	}
	if reviewedStr := c.Query("reviewed"); reviewedStr != "" {
		reviewed := reviewedStr == "true"
		params.Reviewed = &reviewed
	}

	result, err := h.svc.List(c.Request.Context(), params)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, TransactionListResponse{
		Data:  mapSlice(result.Data, toTransactionResponseFromList),
		Total: result.Total,
	})
}

// GetTransaction returns a single transaction by hash.
//
//	@ID			getTransaction
//	@Summary	Get transaction
//	@Tags		transactions
//	@Produce	json
//	@Param		hash	path		string	true	"Transaction hash"
//	@Success	200		{object}	TransactionResponse
//	@Router		/api/v1/transactions/{hash} [get]
func (h *TransactionHandler) GetTransaction(c *gin.Context) {
	hash := c.Param("hash")

	tx, err := h.svc.GetByHash(c.Request.Context(), hash)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toTransactionResponse(tx))
}

// ReviewTransaction updates transaction review status and metadata.
//
//	@ID			reviewTransaction
//	@Summary	Review transaction
//	@Tags		transactions
//	@Accept		json
//	@Produce	json
//	@Param		hash	path		string						true	"Transaction hash"
//	@Param		body	body		ReviewTransactionRequest	true	"Review data"
//	@Success	200		{object}	StatusResponse
//	@Router		/api/v1/transactions/{hash}/review [patch]
func (h *TransactionHandler) ReviewTransaction(c *gin.Context) {
	hash := c.Param("hash")

	var input ReviewTransactionRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.svc.UpdateMetadata(c.Request.Context(), hash, service.UpdateMetadataInput{
		Reviewed:         input.Reviewed,
		Tags:             input.Tags,
		CategoryOverride: input.CategoryOverride,
		Notes:            input.Notes,
	})
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}
