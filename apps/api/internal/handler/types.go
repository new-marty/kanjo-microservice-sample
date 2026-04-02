package handler

// --- Request types ---

// ReviewTransactionRequest is the request body for reviewing a transaction.
type ReviewTransactionRequest struct {
	Reviewed         *bool    `json:"reviewed"`
	Tags             []string `json:"tags"`
	CategoryOverride *string  `json:"category_override"`
	Notes            *string  `json:"notes"`
}

// UpsertBudgetRequest is the request body for creating or updating a budget.
type UpsertBudgetRequest struct {
	CategoryName    string  `json:"category_name" binding:"required"`
	MonthlyBudget   int64   `json:"monthly_budget" binding:"required"`
	RolloverEnabled *bool   `json:"rollover_enabled"`
	Color           *string `json:"color"`
}

// CreateGoalRequest is the request body for creating a savings goal.
type CreateGoalRequest struct {
	Name          string  `json:"name" binding:"required"`
	TargetAmount  int64   `json:"target_amount" binding:"required"`
	CurrentAmount *int64  `json:"current_amount"`
	Deadline      *string `json:"deadline"`
	Icon          *string `json:"icon"`
	Color         *string `json:"color"`
}

// UpdateGoalRequest is the request body for updating a savings goal.
type UpdateGoalRequest struct {
	Name          *string `json:"name"`
	TargetAmount  *int64  `json:"target_amount"`
	CurrentAmount *int64  `json:"current_amount"`
	Deadline      *string `json:"deadline"`
	Icon          *string `json:"icon"`
	Color         *string `json:"color"`
	Archived      *bool   `json:"archived"`
}

// UpdateInstitutionRequest is the request body for updating institution settings.
type UpdateInstitutionRequest struct {
	DisplayName *string `json:"display_name"`
	Icon        *string `json:"icon"`
	Color       *string `json:"color"`
	Hidden      *bool   `json:"hidden"`
}

// ChatRequest is the request body for the chat endpoint.
type ChatRequest struct {
	Message        string  `json:"message" binding:"required"`
	ConversationID *string `json:"conversation_id"`
	Model          *string `json:"model"`
}

// ConversationResponse is the API representation of a chat conversation.
type ConversationResponse struct {
	ID        string `json:"id" binding:"required"`
	Title     string `json:"title" binding:"required"`
	Model     string `json:"model" binding:"required"`
	CreatedAt string `json:"created_at" binding:"required"`
	UpdatedAt string `json:"updated_at" binding:"required"`
}

// ConversationDetailResponse is a conversation with its messages.
type ConversationDetailResponse struct {
	ID        string                `json:"id" binding:"required"`
	Title     string                `json:"title" binding:"required"`
	Model     string                `json:"model" binding:"required"`
	Messages  []ChatMessageResponse `json:"messages" binding:"required"`
	CreatedAt string                `json:"created_at" binding:"required"`
	UpdatedAt string                `json:"updated_at" binding:"required"`
}

// ChatMessageResponse is the API representation of a chat message.
type ChatMessageResponse struct {
	ID        string `json:"id" binding:"required"`
	Role      string `json:"role" binding:"required"`
	Content   string `json:"content" binding:"required"`
	CreatedAt string `json:"created_at" binding:"required"`
}

// StatusResponse is a generic success response.
type StatusResponse struct {
	Status string `json:"status" binding:"required" example:"ok"`
}

// HealthResponse is the health check response.
type HealthResponse struct {
	Status   string `json:"status" binding:"required" example:"ok"`
	Database string `json:"database" binding:"required" example:"connected"`
}

// DataWrapper wraps a list response in a data field.
// swag inline composition overrides the Data type per endpoint.
type DataWrapper struct {
	Data interface{} `json:"data"`
}

// --- Transaction response types ---

// TransactionResponse is the API representation of a transaction.
type TransactionResponse struct {
	Hash                string   `json:"hash" binding:"required"`
	RawHash             string   `json:"raw_hash" binding:"required"`
	Date                string   `json:"date" binding:"required"`
	Description         string   `json:"description" binding:"required"`
	Amount              int64    `json:"amount" binding:"required"`
	CategoryID          *string  `json:"category_id"`
	CategoryName        *string  `json:"category_name"`
	CategoryIcon        *string  `json:"category_icon"`
	CategoryColor       *string  `json:"category_color"`
	MerchantName        *string  `json:"merchant_name"`
	MerchantDisplayName *string  `json:"merchant_display_name"`
	MerchantIcon        *string  `json:"merchant_icon"`
	AccountName         string   `json:"account_name" binding:"required"`
	IsTransfer          bool     `json:"is_transfer" binding:"required"`
	IsRecurring         bool     `json:"is_recurring" binding:"required"`
	Reviewed            bool     `json:"reviewed" binding:"required"`
	Tags                []string `json:"tags" binding:"required"`
	CategoryOverride    *string  `json:"category_override"`
	Notes               *string  `json:"notes"`
	CategoryConfidence  *float64 `json:"category_confidence"`
	CreatedAt           string   `json:"created_at" binding:"required"`
}

// TransactionListResponse wraps a list of transactions with a total count.
type TransactionListResponse struct {
	Data  []TransactionResponse `json:"data" binding:"required"`
	Total int64                 `json:"total" binding:"required"`
}

// --- Analytics response types ---

// DashboardResponse is the API representation of all dashboard data.
type DashboardResponse struct {
	NetWorth           NetWorthResponse            `json:"net_worth" binding:"required"`
	MonthlySummary     MonthlySummaryResponse      `json:"monthly_summary" binding:"required"`
	SpendingPace       SpendingPaceResponse        `json:"spending_pace" binding:"required"`
	CategoryBudgets    []CategoryBudgetResponse    `json:"category_budgets" binding:"required"`
	RecentTransactions []RecentTransactionResponse `json:"recent_transactions" binding:"required"`
}

// NetWorthResponse is the API representation of net worth data.
type NetWorthResponse struct {
	Current       int64                  `json:"current" binding:"required"`
	PreviousMonth int64                  `json:"previous_month" binding:"required"`
	History       []NetWorthHistoryEntry `json:"history" binding:"required"`
}

// NetWorthHistoryEntry is a single data point in net worth history.
type NetWorthHistoryEntry struct {
	Date  string `json:"date" binding:"required"`
	Total int64  `json:"total" binding:"required"`
}

// MonthlySummaryResponse is the API representation of monthly income/expense summary.
type MonthlySummaryResponse struct {
	Income      int64   `json:"income" binding:"required"`
	Expenses    int64   `json:"expenses" binding:"required"`
	Saved       int64   `json:"saved" binding:"required"`
	SavingsRate float64 `json:"savings_rate" binding:"required"`
}

// SpendingPaceResponse is the API representation of spending pace data.
type SpendingPaceResponse struct {
	DaysInMonth    int                 `json:"days_in_month" binding:"required"`
	DayOfMonth     int                 `json:"day_of_month" binding:"required"`
	Budget         int64               `json:"budget" binding:"required"`
	ActualSpending []SpendingPaceEntry `json:"actual_spending" binding:"required"`
}

// SpendingPaceEntry is a single day's cumulative spending.
type SpendingPaceEntry struct {
	DayOfMonth         int32 `json:"day_of_month" binding:"required"`
	CumulativeSpending int64 `json:"cumulative_spending" binding:"required"`
}

// CategoryBudgetResponse is the API representation of a category budget with progress.
type CategoryBudgetResponse struct {
	CategoryName    string `json:"category_name" binding:"required"`
	MonthlyBudget   int64  `json:"monthly_budget" binding:"required"`
	RolloverEnabled bool   `json:"rollover_enabled" binding:"required"`
	Color           string `json:"color" binding:"required"`
	Rollover        int64  `json:"rollover" binding:"required"`
	Spent           int64  `json:"spent" binding:"required"`
}

// RecentTransactionResponse is a simplified transaction for the dashboard.
type RecentTransactionResponse struct {
	Hash         string  `json:"hash" binding:"required"`
	Date         string  `json:"date" binding:"required"`
	Description  string  `json:"description" binding:"required"`
	Amount       int64   `json:"amount" binding:"required"`
	CategoryName *string `json:"category_name"`
	AccountName  string  `json:"account_name" binding:"required"`
	Reviewed     bool    `json:"reviewed" binding:"required"`
}

// SpendingByCategoryResponse is the API representation of spending by category.
type SpendingByCategoryResponse struct {
	CategoryID       string `json:"category_id" binding:"required"`
	CategoryName     string `json:"category_name" binding:"required"`
	CategoryIcon     string `json:"category_icon" binding:"required"`
	CategoryColor    string `json:"category_color" binding:"required"`
	TotalAmount      int64  `json:"total_amount" binding:"required"`
	TransactionCount int32  `json:"transaction_count" binding:"required"`
}

// CashFlowResponse is the API representation of a month's cash flow.
type CashFlowResponse struct {
	Month    string `json:"month" binding:"required"`
	Income   int64  `json:"income" binding:"required"`
	Expenses int64  `json:"expenses" binding:"required"`
}

// AssetCompositionResponse is the API representation of asset breakdown by type.
type AssetCompositionResponse struct {
	AssetType string `json:"asset_type" binding:"required"`
	Total     int64  `json:"total" binding:"required"`
}

// AssetTrendResponse is the API representation of historical asset values.
type AssetTrendResponse struct {
	Date      string `json:"date" binding:"required"`
	AssetType string `json:"asset_type" binding:"required"`
	Total     int64  `json:"total" binding:"required"`
}

// DailyRankingResponse is the API representation of a daily asset ranking entry.
type DailyRankingResponse struct {
	InstitutionName string `json:"institution_name" binding:"required"`
	AccountName     string `json:"account_name" binding:"required"`
	AssetType       string `json:"asset_type" binding:"required"`
	CurrentBalance  int64  `json:"current_balance" binding:"required"`
	PreviousBalance int64  `json:"previous_balance" binding:"required"`
	Change          int64  `json:"change" binding:"required"`
}

// --- Budget response types ---

// BudgetWithProgressResponse is the API representation of a budget with current progress.
type BudgetWithProgressResponse struct {
	CategoryName    string `json:"category_name" binding:"required"`
	MonthlyBudget   int64  `json:"monthly_budget" binding:"required"`
	RolloverEnabled bool   `json:"rollover_enabled" binding:"required"`
	Color           string `json:"color" binding:"required"`
	Rollover        int64  `json:"rollover" binding:"required"`
	Spent           int64  `json:"spent" binding:"required"`
}

// BudgetPeriodResponse is the API representation of a budget period.
type BudgetPeriodResponse struct {
	ID           int64  `json:"id" binding:"required"`
	CategoryName string `json:"category_name" binding:"required"`
	Period       string `json:"period" binding:"required"`
	Budget       int64  `json:"budget" binding:"required"`
	Rollover     int64  `json:"rollover" binding:"required"`
	Spent        int64  `json:"spent" binding:"required"`
	CreatedAt    string `json:"created_at" binding:"required"`
	UpdatedAt    string `json:"updated_at" binding:"required"`
}

// --- Goal response types ---

// SavingsGoalResponse is the API representation of a savings goal.
type SavingsGoalResponse struct {
	ID            int64   `json:"id" binding:"required"`
	Name          string  `json:"name" binding:"required"`
	TargetAmount  int64   `json:"target_amount" binding:"required"`
	CurrentAmount int64   `json:"current_amount" binding:"required"`
	Deadline      *string `json:"deadline"`
	Icon          string  `json:"icon" binding:"required"`
	Color         string  `json:"color" binding:"required"`
	Archived      bool    `json:"archived" binding:"required"`
	CreatedAt     string  `json:"created_at" binding:"required"`
	UpdatedAt     string  `json:"updated_at" binding:"required"`
}

// --- Insight response types ---

// InsightResponse is the API representation of an AI insight.
type InsightResponse struct {
	ID          int64   `json:"id" binding:"required"`
	Type        string  `json:"type" binding:"required"`
	Title       string  `json:"title" binding:"required"`
	Description string  `json:"description" binding:"required"`
	ActionUrl   *string `json:"action_url"`
	Dismissed   bool    `json:"dismissed" binding:"required"`
	ExpiresAt   *string `json:"expires_at"`
	CreatedAt   string  `json:"created_at" binding:"required"`
}

// --- Setting types ---

// SettingResponse is the API representation of an app setting.
type SettingResponse struct {
	Key         string `json:"key" binding:"required"`
	Value       string `json:"value" binding:"required"`
	IsSecret    bool   `json:"is_secret" binding:"required"`
	Description string `json:"description" binding:"required"`
	Configured  bool   `json:"configured" binding:"required"`
	UpdatedAt   string `json:"updated_at" binding:"required"`
}

// UpdateSettingRequest is the request body for updating a setting.
type UpdateSettingRequest struct {
	Value string `json:"value"`
}

// --- Sync response types ---

// SyncStatusResponse is the API representation of the last sync status.
type SyncStatusResponse struct {
	LastSyncAt              *string `json:"last_sync_at"`
	TransactionsProcessed   int32   `json:"transactions_processed" binding:"required"`
	TransactionsTransformed int32   `json:"transactions_transformed" binding:"required"`
}

// --- Institution response types ---

// InstitutionResponse is the API representation of a financial institution.
type InstitutionResponse struct {
	InstitutionName string  `json:"institution_name" binding:"required"`
	DisplayName     string  `json:"display_name" binding:"required"`
	Icon            *string `json:"icon"`
	Color           string  `json:"color" binding:"required"`
	Hidden          bool    `json:"hidden" binding:"required"`
}
