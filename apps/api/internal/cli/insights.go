package cli

import (
	"fmt"
	"net/url"
	"strconv"

	"github.com/spf13/cobra"
)

func newInsightsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "insights",
		Short: "Manage insights",
	}
	cmd.AddCommand(
		newInsightsListCmd(),
		newInsightsDismissCmd(),
	)
	return cmd
}

func newInsightsListCmd() *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List insights",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if limit > 0 {
				q.Set("limit", strconv.Itoa(limit))
			}
			data, err := doGet("/api/v1/insights", q)
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

func newInsightsDismissCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "dismiss ID",
		Short: "Dismiss insight",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid insight ID: %s", args[0])
			}
			data, err := doRequest("POST", fmt.Sprintf("/api/v1/insights/%d/dismiss", id), nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}
