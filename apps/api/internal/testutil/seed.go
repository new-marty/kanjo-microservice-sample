package testutil

import (
	"context"
	"crypto/sha256"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// SeedInstitutions inserts test institutions.
func SeedInstitutions(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	institutions := []struct {
		name        string
		displayName string
		color       string
	}{
		{"三菱UFJ銀行", "MUFG Bank", "#CC0000"},
		{"SBI証券", "SBI Securities", "#003399"},
	}

	for _, inst := range institutions {
		_, err := pool.Exec(ctx,
			`INSERT INTO kanjo.institutions (institution_name, display_name, color)
			 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			inst.name, inst.displayName, inst.color)
		if err != nil {
			t.Fatalf("failed to seed institution %s: %v", inst.name, err)
		}
	}
}

// SeedTransactions inserts test transactions across categories.
// Requires categories from migration 003.
func SeedTransactions(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	now := time.Now()
	thisMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	txns := []struct {
		date        time.Time
		description string
		amount      int64
		accountName string
		categoryID  string
		reviewed    bool
	}{
		{thisMonth.AddDate(0, 0, 1), "給与振込", 300000, "三菱UFJ普通", "income-salary", true},
		{thisMonth.AddDate(0, 0, 3), "スーパー マルエツ", -4500, "三菱UFJ普通", "expense-groceries", false},
		{thisMonth.AddDate(0, 0, 5), "スターバックス", -680, "三菱UFJクレジット", "expense-cafe", false},
		{thisMonth.AddDate(0, 0, 7), "家賃 2月分", -120000, "三菱UFJ普通", "expense-rent", true},
		{thisMonth.AddDate(0, 0, 10), "Amazon.co.jp", -3200, "三菱UFJクレジット", "expense-daily", false},
		{thisMonth.AddDate(0, -1, 15), "先月の給与", 300000, "三菱UFJ普通", "income-salary", true},
	}

	for _, tx := range txns {
		hash := txHash(tx.date, tx.amount, tx.accountName, tx.description)
		rawHash := "raw_" + hash
		_, err := pool.Exec(ctx,
			`INSERT INTO kanjo.transactions
			 (hash, raw_hash, date, amount, account_name, description, category_id, reviewed)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 ON CONFLICT DO NOTHING`,
			hash, rawHash, tx.date, tx.amount, tx.accountName, tx.description, tx.categoryID, tx.reviewed)
		if err != nil {
			t.Fatalf("failed to seed transaction %s: %v", tx.description, err)
		}
	}
}

// SeedDailyAssets inserts asset snapshots. Requires SeedInstitutions.
func SeedDailyAssets(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	yesterday := today.AddDate(0, 0, -1)

	assets := []struct {
		date            time.Time
		institutionName string
		accountName     string
		assetType       string
		balance         int64
	}{
		{yesterday, "三菱UFJ銀行", "普通預金", "deposit", 1500000},
		{yesterday, "SBI証券", "特定口座", "investment", 3000000},
		{today, "三菱UFJ銀行", "普通預金", "deposit", 1450000},
		{today, "SBI証券", "特定口座", "investment", 3100000},
	}

	for _, a := range assets {
		_, err := pool.Exec(ctx,
			`INSERT INTO kanjo.daily_assets
			 (raw_id, date, institution_name, account_name, asset_type, balance)
			 VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
			 ON CONFLICT DO NOTHING`,
			a.date, a.institutionName, a.accountName, a.assetType, a.balance)
		if err != nil {
			t.Fatalf("failed to seed daily asset: %v", err)
		}
	}
}

// SeedBudgets inserts budget categories and periods.
func SeedBudgets(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	now := time.Now()
	period := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	budgets := []struct {
		categoryName  string
		monthlyBudget int64
		color         string
	}{
		{"expense-food", 50000, "#F97316"},
		{"expense-transport", 20000, "#3B82F6"},
	}

	for _, b := range budgets {
		_, err := pool.Exec(ctx,
			`INSERT INTO kanjo.budget_categories (category_name, monthly_budget, color)
			 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
			b.categoryName, b.monthlyBudget, b.color)
		if err != nil {
			t.Fatalf("failed to seed budget category %s: %v", b.categoryName, err)
		}

		_, err = pool.Exec(ctx,
			`INSERT INTO kanjo.budget_periods (category_name, period, budget, spent)
			 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
			b.categoryName, period, b.monthlyBudget, int64(0))
		if err != nil {
			t.Fatalf("failed to seed budget period for %s: %v", b.categoryName, err)
		}
	}
}

// SeedInsights inserts test insights: 2 active, 1 dismissed.
func SeedInsights(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	insights := []struct {
		insightType string
		title       string
		description string
		dismissed   bool
	}{
		{"alert", "食費が先月比20%増加", "今月の食費が予算を超過するペースです", false},
		{"positive", "貯蓄率が向上", "先月比で貯蓄率が5%改善しました", false},
		{"optimize", "サブスク見直し提案", "使用頻度の低いサブスクがあります", true},
	}

	for _, ins := range insights {
		_, err := pool.Exec(ctx,
			`INSERT INTO kanjo.insights (type, title, description, dismissed)
			 VALUES ($1, $2, $3, $4)`,
			ins.insightType, ins.title, ins.description, ins.dismissed)
		if err != nil {
			t.Fatalf("failed to seed insight %s: %v", ins.title, err)
		}
	}
}

// SeedConversations inserts 2 chat conversations with 2 messages each (user + assistant).
func SeedConversations(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	ctx := context.Background()
	conversations := []struct {
		title string
		model string
	}{
		{"今月の支出について", "anthropic/claude-haiku-4.5"},
		{"貯蓄の相談", "anthropic/claude-haiku-4.5"},
	}

	for _, conv := range conversations {
		var convID string
		err := pool.QueryRow(ctx,
			`INSERT INTO kanjo.chat_conversations (title, model)
			 VALUES ($1, $2) RETURNING id::text`,
			conv.title, conv.model).Scan(&convID)
		if err != nil {
			t.Fatalf("failed to seed conversation %s: %v", conv.title, err)
		}

		messages := []struct {
			role    string
			content string
		}{
			{"user", "今月の支出を教えて"},
			{"assistant", "今月の支出は合計125,380円です。"},
		}

		for _, msg := range messages {
			_, err := pool.Exec(ctx,
				`INSERT INTO kanjo.chat_messages (conversation_id, role, content)
				 VALUES ($1::uuid, $2, $3)`,
				convID, msg.role, msg.content)
			if err != nil {
				t.Fatalf("failed to seed chat message: %v", err)
			}
		}
	}
}

// SeedAll seeds all test data in FK dependency order.
func SeedAll(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()

	SeedInstitutions(t, pool)
	SeedTransactions(t, pool)
	SeedDailyAssets(t, pool)
	SeedBudgets(t, pool)
	SeedInsights(t, pool)
}

func txHash(date time.Time, amount int64, account, description string) string {
	data := fmt.Sprintf("%s|%d|%s|%s", date.Format("2006-01-02"), amount, account, description)
	h := sha256.Sum256([]byte(data))
	return fmt.Sprintf("%x", h[:16])
}
