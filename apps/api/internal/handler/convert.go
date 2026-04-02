package handler

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/new-marty/kanjo/internal/repository"
	"github.com/new-marty/kanjo/internal/service"
)

// --- pgtype helpers ---

func textPtr(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	return &t.String
}

func dateStr(d pgtype.Date) string {
	if !d.Valid {
		return ""
	}
	return d.Time.Format("2006-01-02")
}

func timestampStr(t pgtype.Timestamptz) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format("2006-01-02T15:04:05Z07:00")
}

func timestampPtr(t pgtype.Timestamptz) *string {
	if !t.Valid {
		return nil
	}
	s := t.Time.Format("2006-01-02T15:04:05Z07:00")
	return &s
}

func int4Float64Ptr(i pgtype.Int4) *float64 {
	if !i.Valid {
		return nil
	}
	f := float64(i.Int32)
	return &f
}

func datePtr(d pgtype.Date) *string {
	if !d.Valid {
		return nil
	}
	s := d.Time.Format("2006-01-02")
	return &s
}

// --- Generic slice mapper ---

func mapSlice[T any, U any](items []T, fn func(*T) U) []U {
	result := make([]U, len(items))
	for i := range items {
		result[i] = fn(&items[i])
	}
	return result
}

// --- Analytics converters ---

func toDashboardResponse(d *service.DashboardData) DashboardResponse {
	return DashboardResponse{
		NetWorth:           toNetWorthResponse(&d.NetWorth),
		MonthlySummary:     toMonthlySummaryResponse(&d.MonthlySummary),
		SpendingPace:       toSpendingPaceResponse(&d.SpendingPace),
		CategoryBudgets:    mapSlice(d.CategoryBudgets, toCategoryBudgetResponse),
		RecentTransactions: mapSlice(d.RecentTransactions, toRecentTransactionResponse),
	}
}

func toNetWorthResponse(d *service.NetWorthData) NetWorthResponse {
	return NetWorthResponse{
		Current:       d.Current,
		PreviousMonth: d.PreviousMonth,
		History:       mapSlice(d.History, toNetWorthHistoryEntry),
	}
}

func toNetWorthHistoryEntry(r *repository.GetNetWorthHistoryRow) NetWorthHistoryEntry {
	return NetWorthHistoryEntry{
		Date:  dateStr(r.Date),
		Total: r.Total,
	}
}

func toMonthlySummaryResponse(d *service.MonthlySummaryData) MonthlySummaryResponse {
	return MonthlySummaryResponse{
		Income:      d.Income,
		Expenses:    d.Expenses,
		Saved:       d.Saved,
		SavingsRate: d.SavingsRate,
	}
}

func toSpendingPaceResponse(d *service.SpendingPaceData) SpendingPaceResponse {
	return SpendingPaceResponse{
		DaysInMonth:    d.DaysInMonth,
		DayOfMonth:     d.DayOfMonth,
		Budget:         d.Budget,
		ActualSpending: mapSlice(d.ActualSpending, toSpendingPaceEntry),
	}
}

func toSpendingPaceEntry(r *repository.GetSpendingPaceRow) SpendingPaceEntry {
	return SpendingPaceEntry{
		DayOfMonth:         r.DayOfMonth,
		CumulativeSpending: r.CumulativeSpending,
	}
}

func toCategoryBudgetResponse(r *repository.GetCategoryBudgetsRow) CategoryBudgetResponse {
	return CategoryBudgetResponse{
		CategoryName:    r.CategoryName,
		MonthlyBudget:   r.MonthlyBudget,
		RolloverEnabled: r.RolloverEnabled,
		Color:           r.Color,
		Rollover:        r.Rollover,
		Spent:           r.Spent,
	}
}

func toRecentTransactionResponse(r *repository.GetRecentTransactionsRow) RecentTransactionResponse {
	return RecentTransactionResponse{
		Hash:         r.Hash,
		Date:         dateStr(r.Date),
		Description:  r.Description,
		Amount:       r.Amount,
		CategoryName: textPtr(r.CategoryName),
		AccountName:  r.AccountName,
		Reviewed:     r.Reviewed,
	}
}

func toSpendingByCategoryResponse(r *repository.SpendingByCategoryRow) SpendingByCategoryResponse {
	return SpendingByCategoryResponse{
		CategoryID:       r.CategoryID,
		CategoryName:     r.CategoryName,
		CategoryIcon:     r.CategoryIcon,
		CategoryColor:    r.CategoryColor,
		TotalAmount:      r.TotalAmount,
		TransactionCount: r.TransactionCount,
	}
}

func toCashFlowResponse(r *repository.GetCashFlowRow) CashFlowResponse {
	return CashFlowResponse{
		Month:    dateStr(r.Month),
		Income:   r.Income,
		Expenses: r.Expenses,
	}
}

func toAssetCompositionResponse(r *repository.GetAssetCompositionRow) AssetCompositionResponse {
	return AssetCompositionResponse{
		AssetType: r.AssetType,
		Total:     r.Total,
	}
}

func toAssetTrendResponse(r *repository.GetAssetTrendRow) AssetTrendResponse {
	return AssetTrendResponse{
		Date:      dateStr(r.Date),
		AssetType: r.AssetType,
		Total:     r.Total,
	}
}

func toDailyRankingResponse(r *repository.GetDailyRankingsRow) DailyRankingResponse {
	return DailyRankingResponse{
		InstitutionName: r.InstitutionName,
		AccountName:     r.AccountName,
		AssetType:       r.AssetType,
		CurrentBalance:  r.CurrentBalance,
		PreviousBalance: r.PreviousBalance,
		Change:          r.Change,
	}
}

// --- Transaction converters ---

func toTransactionResponse(t *repository.GetTransactionByHashRow) TransactionResponse {
	return TransactionResponse{
		Hash:                t.Hash,
		RawHash:             t.RawHash,
		Date:                dateStr(t.Date),
		Description:         t.Description,
		Amount:              t.Amount,
		CategoryID:          textPtr(t.CategoryID),
		CategoryName:        textPtr(t.CategoryName),
		CategoryIcon:        textPtr(t.CategoryIcon),
		CategoryColor:       textPtr(t.CategoryColor),
		MerchantName:        textPtr(t.MerchantName),
		MerchantDisplayName: textPtr(t.MerchantDisplayName),
		MerchantIcon:        textPtr(t.MerchantIcon),
		AccountName:         t.AccountName,
		IsTransfer:          t.IsTransfer,
		IsRecurring:         t.IsRecurring,
		Reviewed:            t.Reviewed,
		Tags:                t.Tags,
		CategoryOverride:    textPtr(t.CategoryOverride),
		Notes:               textPtr(t.Notes),
		CategoryConfidence:  int4Float64Ptr(t.CategoryConfidence),
		CreatedAt:           timestampStr(t.CreatedAt),
	}
}

func toTransactionResponseFromList(t *repository.ListTransactionsRow) TransactionResponse {
	return TransactionResponse{
		Hash:                t.Hash,
		RawHash:             t.RawHash,
		Date:                dateStr(t.Date),
		Description:         t.Description,
		Amount:              t.Amount,
		CategoryID:          textPtr(t.CategoryID),
		CategoryName:        textPtr(t.CategoryName),
		CategoryIcon:        textPtr(t.CategoryIcon),
		CategoryColor:       textPtr(t.CategoryColor),
		MerchantName:        textPtr(t.MerchantName),
		MerchantDisplayName: textPtr(t.MerchantDisplayName),
		MerchantIcon:        textPtr(t.MerchantIcon),
		AccountName:         t.AccountName,
		IsTransfer:          t.IsTransfer,
		IsRecurring:         t.IsRecurring,
		Reviewed:            t.Reviewed,
		Tags:                t.Tags,
		CategoryOverride:    textPtr(t.CategoryOverride),
		Notes:               textPtr(t.Notes),
		CategoryConfidence:  int4Float64Ptr(t.CategoryConfidence),
		CreatedAt:           timestampStr(t.CreatedAt),
	}
}

// --- Budget converters ---

func toBudgetWithProgressResponse(b *service.BudgetWithProgress) BudgetWithProgressResponse {
	return BudgetWithProgressResponse{
		CategoryName:    b.CategoryName,
		MonthlyBudget:   b.MonthlyBudget,
		RolloverEnabled: b.RolloverEnabled,
		Color:           b.Color,
		Rollover:        b.Rollover,
		Spent:           b.Spent,
	}
}

func toBudgetPeriodResponse(p *repository.KanjoBudgetPeriod) BudgetPeriodResponse {
	return BudgetPeriodResponse{
		ID:           p.ID,
		CategoryName: p.CategoryName,
		Period:       dateStr(p.Period),
		Budget:       p.Budget,
		Rollover:     p.Rollover,
		Spent:        p.Spent,
		CreatedAt:    timestampStr(p.CreatedAt),
		UpdatedAt:    timestampStr(p.UpdatedAt),
	}
}

// --- Goal converters ---

func toSavingsGoalResponse(g *repository.KanjoSavingsGoal) SavingsGoalResponse {
	return SavingsGoalResponse{
		ID:            g.ID,
		Name:          g.Name,
		TargetAmount:  g.TargetAmount,
		CurrentAmount: g.CurrentAmount,
		Deadline:      datePtr(g.Deadline),
		Icon:          g.Icon,
		Color:         g.Color,
		Archived:      g.Archived,
		CreatedAt:     timestampStr(g.CreatedAt),
		UpdatedAt:     timestampStr(g.UpdatedAt),
	}
}

// --- Insight converters ---

func toInsightResponse(i *repository.KanjoInsight) InsightResponse {
	return InsightResponse{
		ID:          i.ID,
		Type:        i.Type,
		Title:       i.Title,
		Description: i.Description,
		ActionUrl:   textPtr(i.ActionUrl),
		Dismissed:   i.Dismissed,
		ExpiresAt:   timestampPtr(i.ExpiresAt),
		CreatedAt:   timestampStr(i.CreatedAt),
	}
}

// --- Chat converters ---

func uuidStr(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x",
		u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8],
		u.Bytes[8:10], u.Bytes[10:16])
}

func toConversationResponse(c *repository.KanjoChatConversation) ConversationResponse {
	return ConversationResponse{
		ID:        uuidStr(c.ID),
		Title:     c.Title,
		Model:     c.Model,
		CreatedAt: timestampStr(c.CreatedAt),
		UpdatedAt: timestampStr(c.UpdatedAt),
	}
}

func toConversationDetailResponse(c *repository.KanjoChatConversation, msgs []repository.KanjoChatMessage) ConversationDetailResponse {
	return ConversationDetailResponse{
		ID:        uuidStr(c.ID),
		Title:     c.Title,
		Model:     c.Model,
		Messages:  mapSlice(msgs, toChatMessageResponse),
		CreatedAt: timestampStr(c.CreatedAt),
		UpdatedAt: timestampStr(c.UpdatedAt),
	}
}

func toChatMessageResponse(m *repository.KanjoChatMessage) ChatMessageResponse {
	return ChatMessageResponse{
		ID:        uuidStr(m.ID),
		Role:      m.Role,
		Content:   m.Content,
		CreatedAt: timestampStr(m.CreatedAt),
	}
}

// --- Institution converters ---

func toInstitutionResponse(i *repository.ListInstitutionsRow) InstitutionResponse {
	return InstitutionResponse{
		InstitutionName: i.InstitutionName,
		DisplayName:     i.DisplayName,
		Icon:            textPtr(i.Icon),
		Color:           i.Color,
		Hidden:          i.Hidden,
	}
}
