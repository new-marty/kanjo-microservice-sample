package cli

import "github.com/spf13/cobra"

func newSyncCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "sync",
		Short: "Sync status",
	}
	cmd.AddCommand(newSyncStatusCmd())
	return cmd
}

func newSyncStatusCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "status",
		Short: "Get sync status",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/sync/status", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}
