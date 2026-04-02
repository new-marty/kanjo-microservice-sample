package service_test

import (
	"context"
	"testing"

	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/service"
	"github.com/new-marty/kanjo/internal/testutil"
)

func TestBudgetUpsert_ValidInput(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewBudgetService(testQueries)

	err := svc.Upsert(context.Background(), service.UpsertInput{
		CategoryName:  "Food",
		MonthlyBudget: 50000,
		Color:         "#FF0000",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	budgets, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error listing: %v", err)
	}

	found := false
	for _, b := range budgets {
		if b.CategoryName == "Food" {
			found = true
			if b.MonthlyBudget != 50000 {
				t.Errorf("expected monthly_budget=50000, got %d", b.MonthlyBudget)
			}
			if b.Color != "#FF0000" {
				t.Errorf("expected color=#FF0000, got %s", b.Color)
			}
		}
	}
	if !found {
		t.Error("budget 'Food' not found in list")
	}
}

func TestBudgetUpsert_EmptyCategoryName(t *testing.T) {
	svc := service.NewBudgetService(testQueries)

	err := svc.Upsert(context.Background(), service.UpsertInput{
		MonthlyBudget: 50000,
	})
	if err == nil {
		t.Fatal("expected error for empty category_name")
	}
	if !apperror.IsInvalidInput(err) {
		t.Errorf("expected InvalidInput error, got: %v", err)
	}
}

func TestBudgetUpsert_NegativeBudget(t *testing.T) {
	svc := service.NewBudgetService(testQueries)

	err := svc.Upsert(context.Background(), service.UpsertInput{
		CategoryName:  "Test",
		MonthlyBudget: -100,
	})
	if err == nil {
		t.Fatal("expected error for negative budget")
	}
	if !apperror.IsInvalidInput(err) {
		t.Errorf("expected InvalidInput error, got: %v", err)
	}
}

func TestBudgetUpsert_DefaultColor(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewBudgetService(testQueries)

	err := svc.Upsert(context.Background(), service.UpsertInput{
		CategoryName:  "Transport",
		MonthlyBudget: 30000,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	budgets, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error listing: %v", err)
	}

	for _, b := range budgets {
		if b.CategoryName == "Transport" {
			if b.Color != "#6B7280" {
				t.Errorf("expected default color #6B7280, got %s", b.Color)
			}
			return
		}
	}
	t.Error("budget 'Transport' not found")
}

func TestBudgetDelete(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewBudgetService(testQueries)

	err := svc.Upsert(context.Background(), service.UpsertInput{
		CategoryName:  "Entertainment",
		MonthlyBudget: 20000,
	})
	if err != nil {
		t.Fatalf("unexpected error creating: %v", err)
	}

	err = svc.Delete(context.Background(), "Entertainment")
	if err != nil {
		t.Fatalf("unexpected error deleting: %v", err)
	}

	budgets, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error listing: %v", err)
	}

	for _, b := range budgets {
		if b.CategoryName == "Entertainment" {
			t.Error("budget 'Entertainment' should have been deleted")
		}
	}
}
