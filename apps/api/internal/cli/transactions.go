package cli

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
)

func newTransactionsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "transactions",
		Short: "Manage transactions",
	}
	cmd.AddCommand(
		newTransactionsListCmd(),
		newTransactionsGetCmd(),
		newTransactionsReviewCmd(),
	)
	return cmd
}

func newTransactionsListCmd() *cobra.Command {
	var (
		limit      int
		offset     int
		search     string
		categories []string
		dateFrom   string
		dateTo     string
		reviewed   string
	)
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List transactions",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if limit > 0 {
				q.Set("limit", strconv.Itoa(limit))
			}
			if offset > 0 {
				q.Set("offset", strconv.Itoa(offset))
			}
			if search != "" {
				q.Set("search", search)
			}
			if len(categories) > 0 {
				q.Set("categories", strings.Join(categories, ","))
			}
			if dateFrom != "" {
				q.Set("date_from", dateFrom)
			}
			if dateTo != "" {
				q.Set("date_to", dateTo)
			}
			if reviewed != "" {
				q.Set("reviewed", reviewed)
			}
			data, err := doGet("/api/v1/transactions", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 0, "Number of results (default: 50)")
	cmd.Flags().IntVar(&offset, "offset", 0, "Offset for pagination")
	cmd.Flags().StringVar(&search, "search", "", "Search query")
	cmd.Flags().StringSliceVar(&categories, "categories", nil, "Category IDs")
	cmd.Flags().StringVar(&dateFrom, "from", "", "Start date (YYYY-MM-DD)")
	cmd.Flags().StringVar(&dateTo, "to", "", "End date (YYYY-MM-DD)")
	cmd.Flags().StringVar(&reviewed, "reviewed", "", "Filter by reviewed (true/false)")
	return cmd
}

func newTransactionsGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get HASH",
		Short: "Get transaction by hash",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet(fmt.Sprintf("/api/v1/transactions/%s", args[0]), nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newTransactionsReviewCmd() *cobra.Command {
	var (
		categoryOverride string
		notes            string
		tags             []string
		reviewed         bool
	)
	cmd := &cobra.Command{
		Use:   "review HASH",
		Short: "Review a transaction",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if cmd.Flags().Changed("category") {
				body["category_override"] = categoryOverride
			}
			if cmd.Flags().Changed("notes") {
				body["notes"] = notes
			}
			if cmd.Flags().Changed("tags") {
				body["tags"] = tags
			}
			if cmd.Flags().Changed("reviewed") {
				body["reviewed"] = reviewed
			}
			data, err := doRequest("PATCH", fmt.Sprintf("/api/v1/transactions/%s/review", args[0]), body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&categoryOverride, "category", "", "Category override")
	cmd.Flags().StringVar(&notes, "notes", "", "Notes")
	cmd.Flags().StringSliceVar(&tags, "tags", nil, "Tags")
	cmd.Flags().BoolVar(&reviewed, "reviewed", false, "Mark as reviewed")
	return cmd
}
