package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// BudgetHandler handles budget-related requests.
type BudgetHandler struct {
	svc *service.BudgetService
}

// NewBudgetHandler creates a new BudgetHandler.
func NewBudgetHandler(svc *service.BudgetService) *BudgetHandler {
	return &BudgetHandler{svc: svc}
}

// ListBudgets returns all budget categories.
//
//	@ID			listBudgets
//	@Summary	List budgets
//	@Tags		budgets
//	@Produce	json
//	@Success	200	{object}	DataWrapper{data=[]BudgetWithProgressResponse}
//	@Router		/api/v1/budgets [get]
func (h *BudgetHandler) ListBudgets(c *gin.Context) {
	budgets, err := h.svc.List(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(budgets, toBudgetWithProgressResponse)})
}

// UpsertBudget creates or updates a budget category.
//
//	@ID			upsertBudget
//	@Summary	Create or update budget
//	@Tags		budgets
//	@Accept		json
//	@Produce	json
//	@Param		body	body		UpsertBudgetRequest	true	"Budget data"
//	@Success	200		{object}	StatusResponse
//	@Router		/api/v1/budgets [put]
func (h *BudgetHandler) UpsertBudget(c *gin.Context) {
	var input UpsertBudgetRequest

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	svcInput := service.UpsertInput{
		CategoryName:  input.CategoryName,
		MonthlyBudget: input.MonthlyBudget,
	}

	if input.RolloverEnabled != nil {
		svcInput.RolloverEnabled = *input.RolloverEnabled
	}
	if input.Color != nil {
		svcInput.Color = *input.Color
	}

	err := h.svc.Upsert(c.Request.Context(), svcInput)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, StatusResponse{Status: "ok"})
}

// DeleteBudget deletes a budget category.
//
//	@ID			deleteBudget
//	@Summary	Delete budget
//	@Tags		budgets
//	@Param		category	path	string	true	"Category name"
//	@Success	204
//	@Router		/api/v1/budgets/{category} [delete]
func (h *BudgetHandler) DeleteBudget(c *gin.Context) {
	category := c.Param("category")

	err := h.svc.Delete(c.Request.Context(), category)
	if err != nil {
		handleError(c, err)
		return
	}

	c.Status(http.StatusNoContent)
}

// GetBudgetPeriods returns budget history for a category.
//
//	@ID			getBudgetPeriods
//	@Summary	Get budget periods
//	@Tags		budgets
//	@Produce	json
//	@Param		category	path		string	true	"Category name"
//	@Param		limit		query		int		false	"Number of periods"	default(12)
//	@Success	200			{object}	DataWrapper{data=[]BudgetPeriodResponse}
//	@Router		/api/v1/budgets/{category}/periods [get]
func (h *BudgetHandler) GetBudgetPeriods(c *gin.Context) {
	category := c.Param("category")

	limit := int32(12)
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = int32(l)
		}
	}

	periods, err := h.svc.GetPeriods(c.Request.Context(), category, limit)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(periods, toBudgetPeriodResponse)})
}
