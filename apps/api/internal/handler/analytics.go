package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/new-marty/kanjo/internal/service"
)

// AnalyticsHandler handles analytics-related requests.
type AnalyticsHandler struct {
	svc *service.AnalyticsService
}

// NewAnalyticsHandler creates a new AnalyticsHandler.
func NewAnalyticsHandler(svc *service.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{svc: svc}
}

// GetDashboard returns all dashboard data in a single request.
//
//	@ID			getDashboard
//	@Summary	Get dashboard data
//	@Tags		analytics
//	@Produce	json
//	@Success	200	{object}	DashboardResponse
//	@Router		/api/v1/analytics/dashboard [get]
func (h *AnalyticsHandler) GetDashboard(c *gin.Context) {
	data, err := h.svc.GetDashboard(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toDashboardResponse(data))
}

// GetNetWorth returns current net worth and history.
//
//	@ID			getNetWorth
//	@Summary	Get net worth
//	@Tags		analytics
//	@Produce	json
//	@Param		months	query		int	false	"Number of months of history"	default(12)
//	@Success	200		{object}	NetWorthResponse
//	@Router		/api/v1/analytics/net-worth [get]
func (h *AnalyticsHandler) GetNetWorth(c *gin.Context) {
	months := 12
	if monthsStr := c.Query("months"); monthsStr != "" {
		if m, err := strconv.Atoi(monthsStr); err == nil && m > 0 {
			months = m
		}
	}

	data, err := h.svc.GetNetWorth(c.Request.Context(), months)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toNetWorthResponse(data))
}

// GetMonthlySummary returns income/expense summary for current month.
//
//	@ID			getMonthlySummary
//	@Summary	Get monthly summary
//	@Tags		analytics
//	@Produce	json
//	@Success	200	{object}	MonthlySummaryResponse
//	@Router		/api/v1/analytics/monthly-summary [get]
func (h *AnalyticsHandler) GetMonthlySummary(c *gin.Context) {
	data, err := h.svc.GetMonthlySummary(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toMonthlySummaryResponse(data))
}

// GetSpendingPace returns cumulative spending for current month.
//
//	@ID			getSpendingPace
//	@Summary	Get spending pace
//	@Tags		analytics
//	@Produce	json
//	@Success	200	{object}	SpendingPaceResponse
//	@Router		/api/v1/analytics/spending-pace [get]
func (h *AnalyticsHandler) GetSpendingPace(c *gin.Context) {
	data, err := h.svc.GetSpendingPace(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, toSpendingPaceResponse(data))
}

// SpendingByCategory returns spending grouped by category.
//
//	@ID			getSpendingByCategory
//	@Summary	Get spending by category
//	@Tags		analytics
//	@Produce	json
//	@Param		from	query		string	false	"Start date (YYYY-MM-DD)"
//	@Param		to		query		string	false	"End date (YYYY-MM-DD)"
//	@Success	200		{object}	DataWrapper{data=[]SpendingByCategoryResponse}
//	@Router		/api/v1/analytics/spending-by-category [get]
func (h *AnalyticsHandler) SpendingByCategory(c *gin.Context) {
	// Default to current month
	now := time.Now()
	from := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.Local)
	to := now

	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	data, err := h.svc.GetSpendingByCategory(c.Request.Context(), from, to)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(data, toSpendingByCategoryResponse)})
}

// GetCashFlow returns monthly cash flow data.
//
//	@ID			getCashFlow
//	@Summary	Get cash flow
//	@Tags		analytics
//	@Produce	json
//	@Param		from	query		string	false	"Start date (YYYY-MM-DD)"
//	@Param		to		query		string	false	"End date (YYYY-MM-DD)"
//	@Success	200		{object}	DataWrapper{data=[]CashFlowResponse}
//	@Router		/api/v1/analytics/cash-flow [get]
func (h *AnalyticsHandler) GetCashFlow(c *gin.Context) {
	// Default to last 12 months
	now := time.Now()
	from := now.AddDate(-1, 0, 0)
	to := now

	if fromStr := c.Query("from"); fromStr != "" {
		if t, err := time.Parse("2006-01-02", fromStr); err == nil {
			from = t
		}
	}
	if toStr := c.Query("to"); toStr != "" {
		if t, err := time.Parse("2006-01-02", toStr); err == nil {
			to = t
		}
	}

	data, err := h.svc.GetCashFlow(c.Request.Context(), from, to)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(data, toCashFlowResponse)})
}

// GetAssetComposition returns asset breakdown by type.
//
//	@ID			getAssetComposition
//	@Summary	Get asset composition
//	@Tags		analytics
//	@Produce	json
//	@Success	200	{object}	DataWrapper{data=[]AssetCompositionResponse}
//	@Router		/api/v1/analytics/asset-composition [get]
func (h *AnalyticsHandler) GetAssetComposition(c *gin.Context) {
	data, err := h.svc.GetAssetComposition(c.Request.Context())
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(data, toAssetCompositionResponse)})
}

// GetAssetTrend returns historical asset values.
//
//	@ID			getAssetTrend
//	@Summary	Get asset trend
//	@Tags		analytics
//	@Produce	json
//	@Param		since	query		string	false	"Start date (YYYY-MM-DD)"
//	@Success	200		{object}	DataWrapper{data=[]AssetTrendResponse}
//	@Router		/api/v1/analytics/asset-trend [get]
func (h *AnalyticsHandler) GetAssetTrend(c *gin.Context) {
	// Default to last 12 months
	since := time.Now().AddDate(-1, 0, 0)

	if sinceStr := c.Query("since"); sinceStr != "" {
		if t, err := time.Parse("2006-01-02", sinceStr); err == nil {
			since = t
		}
	}

	data, err := h.svc.GetAssetTrend(c.Request.Context(), since)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(data, toAssetTrendResponse)})
}

// GetDailyRankings returns top gainers/decliners.
//
//	@ID			getDailyRankings
//	@Summary	Get daily rankings
//	@Tags		analytics
//	@Produce	json
//	@Param		limit	query		int	false	"Number of results"	default(10)
//	@Success	200		{object}	DataWrapper{data=[]DailyRankingResponse}
//	@Router		/api/v1/analytics/daily-rankings [get]
func (h *AnalyticsHandler) GetDailyRankings(c *gin.Context) {
	limit := int32(10)
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = int32(l)
		}
	}

	data, err := h.svc.GetDailyRankings(c.Request.Context(), limit)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, DataWrapper{Data: mapSlice(data, toDailyRankingResponse)})
}
