package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newSettingsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "settings",
		Short: "Manage app settings",
	}
	cmd.AddCommand(
		newSettingsListCmd(),
		newSettingsSetCmd(),
	)
	return cmd
}

func newSettingsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List app settings",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/settings", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newSettingsSetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "set KEY VALUE",
		Short: "Update a setting",
		Args:  cobra.ExactArgs(2),
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"value": args[1],
			}
			data, err := doRequest("PUT", fmt.Sprintf("/api/v1/settings/%s", args[0]), body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}
