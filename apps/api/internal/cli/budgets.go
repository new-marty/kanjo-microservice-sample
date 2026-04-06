package cli

import (
	"fmt"
	"net/url"
	"strconv"

	"github.com/spf13/cobra"
)

func newBudgetsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "budgets",
		Short: "Manage budgets",
	}
	cmd.AddCommand(
		newBudgetsListCmd(),
		newBudgetsUpsertCmd(),
		newBudgetsDeleteCmd(),
		newBudgetsPeriodsCmd(),
	)
	return cmd
}

func newBudgetsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List budgets",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/budgets", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newBudgetsUpsertCmd() *cobra.Command {
	var (
		category        string
		monthlyBudget   int
		color           string
		rolloverEnabled bool
	)
	cmd := &cobra.Command{
		Use:   "upsert",
		Short: "Create or update budget",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"category_name":  category,
				"monthly_budget": monthlyBudget,
			}
			if cmd.Flags().Changed("color") {
				body["color"] = color
			}
			if cmd.Flags().Changed("rollover") {
				body["rollover_enabled"] = rolloverEnabled
			}
			data, err := doRequest("PUT", "/api/v1/budgets", body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&category, "category", "", "Category name (required)")
	cmd.Flags().IntVar(&monthlyBudget, "budget", 0, "Monthly budget amount in yen (required)")
	cmd.Flags().StringVar(&color, "color", "", "Color")
	cmd.Flags().BoolVar(&rolloverEnabled, "rollover", false, "Enable rollover")
	_ = cmd.MarkFlagRequired("category")
	_ = cmd.MarkFlagRequired("budget")
	return cmd
}

func newBudgetsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete CATEGORY",
		Short: "Delete budget",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			_, err := doRequest("DELETE", fmt.Sprintf("/api/v1/budgets/%s", args[0]), nil)
			if err != nil {
				return err
			}
			fmt.Println("Deleted.")
			return nil
		},
	}
}

func newBudgetsPeriodsCmd() *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "periods CATEGORY",
		Short: "Get budget periods",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if limit > 0 {
				q.Set("limit", strconv.Itoa(limit))
			}
			data, err := doGet(fmt.Sprintf("/api/v1/budgets/%s/periods", args[0]), q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 0, "Number of periods (default: 12)")
	return cmd
}
