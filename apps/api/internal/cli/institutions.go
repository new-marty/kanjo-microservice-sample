package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newInstitutionsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "institutions",
		Short: "Manage institutions",
	}
	cmd.AddCommand(
		newInstitutionsListCmd(),
		newInstitutionsUpdateCmd(),
	)
	return cmd
}

func newInstitutionsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List institutions",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/institutions", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newInstitutionsUpdateCmd() *cobra.Command {
	var (
		displayName string
		color       string
		icon        string
		hidden      bool
	)
	cmd := &cobra.Command{
		Use:   "update NAME",
		Short: "Update institution",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if cmd.Flags().Changed("display-name") {
				body["display_name"] = displayName
			}
			if cmd.Flags().Changed("color") {
				body["color"] = color
			}
			if cmd.Flags().Changed("icon") {
				body["icon"] = icon
			}
			if cmd.Flags().Changed("hidden") {
				body["hidden"] = hidden
			}
			data, err := doRequest("PATCH", fmt.Sprintf("/api/v1/institutions/%s", args[0]), body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&displayName, "display-name", "", "Display name")
	cmd.Flags().StringVar(&color, "color", "", "Color")
	cmd.Flags().StringVar(&icon, "icon", "", "Icon")
	cmd.Flags().BoolVar(&hidden, "hidden", false, "Hide institution")
	return cmd
}
