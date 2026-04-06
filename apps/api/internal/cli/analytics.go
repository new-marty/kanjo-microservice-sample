package cli

import (
	"net/url"
	"strconv"

	"github.com/spf13/cobra"
)

func newDashboardCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dashboard",
		Short: "Get dashboard data",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/analytics/dashboard", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newNetWorthCmd() *cobra.Command {
	var months int
	cmd := &cobra.Command{
		Use:   "net-worth",
		Short: "Get net worth",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if months > 0 {
				q.Set("months", strconv.Itoa(months))
			}
			data, err := doGet("/api/v1/analytics/net-worth", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().IntVar(&months, "months", 0, "Number of months of history (default: 12)")
	return cmd
}

func newMonthlySummaryCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "monthly-summary",
		Short: "Get monthly summary",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/analytics/monthly-summary", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newCashFlowCmd() *cobra.Command {
	var from, to string
	cmd := &cobra.Command{
		Use:   "cash-flow",
		Short: "Get cash flow",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if from != "" {
				q.Set("from", from)
			}
			if to != "" {
				q.Set("to", to)
			}
			data, err := doGet("/api/v1/analytics/cash-flow", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&from, "from", "", "Start date (YYYY-MM-DD)")
	cmd.Flags().StringVar(&to, "to", "", "End date (YYYY-MM-DD)")
	return cmd
}

func newSpendingByCategoryCmd() *cobra.Command {
	var from, to string
	cmd := &cobra.Command{
		Use:   "spending-by-category",
		Short: "Get spending by category",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if from != "" {
				q.Set("from", from)
			}
			if to != "" {
				q.Set("to", to)
			}
			data, err := doGet("/api/v1/analytics/spending-by-category", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&from, "from", "", "Start date (YYYY-MM-DD)")
	cmd.Flags().StringVar(&to, "to", "", "End date (YYYY-MM-DD)")
	return cmd
}

func newSpendingPaceCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "spending-pace",
		Short: "Get spending pace",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/analytics/spending-pace", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newAssetCompositionCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "asset-composition",
		Short: "Get asset composition",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/analytics/asset-composition", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newAssetTrendCmd() *cobra.Command {
	var since string
	cmd := &cobra.Command{
		Use:   "asset-trend",
		Short: "Get asset trend",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if since != "" {
				q.Set("since", since)
			}
			data, err := doGet("/api/v1/analytics/asset-trend", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&since, "since", "", "Start date (YYYY-MM-DD)")
	return cmd
}

func newDailyRankingsCmd() *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "daily-rankings",
		Short: "Get daily rankings",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if limit > 0 {
				q.Set("limit", strconv.Itoa(limit))
			}
			data, err := doGet("/api/v1/analytics/daily-rankings", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 0, "Number of results (default: 10)")
	return cmd
}
