package service_test

import (
	"context"
	"testing"

	"github.com/new-marty/kanjo/internal/apperror"
	"github.com/new-marty/kanjo/internal/service"
	"github.com/new-marty/kanjo/internal/testutil"
)

func TestGoalCreate_ValidInput(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewGoalService(testQueries)

	goal, err := svc.Create(context.Background(), service.CreateInput{
		Name:         "Emergency Fund",
		TargetAmount: 1000000,
		Icon:         "💰",
		Color:        "#16A34A",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if goal.Name != "Emergency Fund" {
		t.Errorf("expected name='Emergency Fund', got '%s'", goal.Name)
	}
	if goal.TargetAmount != 1000000 {
		t.Errorf("expected target_amount=1000000, got %d", goal.TargetAmount)
	}
}

func TestGoalCreate_MissingName(t *testing.T) {
	svc := service.NewGoalService(testQueries)

	_, err := svc.Create(context.Background(), service.CreateInput{
		TargetAmount: 1000000,
	})
	if err == nil {
		t.Fatal("expected error for missing name")
	}
	if !apperror.IsInvalidInput(err) {
		t.Errorf("expected InvalidInput error, got: %v", err)
	}
}

func TestGoalCreate_ZeroTargetAmount(t *testing.T) {
	svc := service.NewGoalService(testQueries)

	_, err := svc.Create(context.Background(), service.CreateInput{
		Name:         "Test",
		TargetAmount: 0,
	})
	if err == nil {
		t.Fatal("expected error for zero target_amount")
	}
	if !apperror.IsInvalidInput(err) {
		t.Errorf("expected InvalidInput error, got: %v", err)
	}
}

func TestGoalCreate_DefaultIconAndColor(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewGoalService(testQueries)

	goal, err := svc.Create(context.Background(), service.CreateInput{
		Name:         "Vacation",
		TargetAmount: 500000,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if goal.Icon != "🎯" {
		t.Errorf("expected default icon '🎯', got '%s'", goal.Icon)
	}
	if goal.Color != "#0891B2" {
		t.Errorf("expected default color '#0891B2', got '%s'", goal.Color)
	}
}

func TestGoalUpdate_PartialUpdate(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewGoalService(testQueries)

	goal, err := svc.Create(context.Background(), service.CreateInput{
		Name:         "House",
		TargetAmount: 10000000,
		Icon:         "🏠",
		Color:        "#DC2626",
	})
	if err != nil {
		t.Fatalf("unexpected error creating: %v", err)
	}

	newName := "New House"
	err = svc.Update(context.Background(), goal.ID, service.UpdateInput{
		Name: &newName,
	})
	if err != nil {
		t.Fatalf("unexpected error updating: %v", err)
	}

	updated, err := svc.Get(context.Background(), goal.ID)
	if err != nil {
		t.Fatalf("unexpected error getting: %v", err)
	}
	if updated.Name != "New House" {
		t.Errorf("expected name='New House', got '%s'", updated.Name)
	}
	if updated.TargetAmount != 10000000 {
		t.Errorf("expected target_amount preserved at 10000000, got %d", updated.TargetAmount)
	}
	if updated.Icon != "🏠" {
		t.Errorf("expected icon preserved at '🏠', got '%s'", updated.Icon)
	}
}

func TestGoalUpdate_NotFound(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewGoalService(testQueries)

	newName := "test"
	err := svc.Update(context.Background(), 99999, service.UpdateInput{
		Name: &newName,
	})
	if err == nil {
		t.Fatal("expected error for non-existent goal")
	}
	if !apperror.IsNotFound(err) {
		t.Errorf("expected NotFound error, got: %v", err)
	}
}

func TestGoalDelete_NotFound(t *testing.T) {
	testutil.CleanTables(t, testPool, testutil.AllTables()...)
	svc := service.NewGoalService(testQueries)

	err := svc.Delete(context.Background(), 99999)
	if err == nil {
		t.Fatal("expected error for non-existent goal")
	}
	if !apperror.IsNotFound(err) {
		t.Errorf("expected NotFound error, got: %v", err)
	}
}
