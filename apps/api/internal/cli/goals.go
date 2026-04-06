package cli

import (
	"fmt"
	"strconv"

	"github.com/spf13/cobra"
)

func newGoalsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "goals",
		Short: "Manage savings goals",
	}
	cmd.AddCommand(
		newGoalsListCmd(),
		newGoalsCreateCmd(),
		newGoalsUpdateCmd(),
		newGoalsDeleteCmd(),
	)
	return cmd
}

func newGoalsListCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "list",
		Short: "List goals",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/api/v1/goals", nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newGoalsCreateCmd() *cobra.Command {
	var (
		name          string
		targetAmount  int
		currentAmount int
		deadline      string
		color         string
		icon          string
	)
	cmd := &cobra.Command{
		Use:   "create",
		Short: "Create goal",
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"name":          name,
				"target_amount": targetAmount,
			}
			if cmd.Flags().Changed("current") {
				body["current_amount"] = currentAmount
			}
			if deadline != "" {
				body["deadline"] = deadline
			}
			if color != "" {
				body["color"] = color
			}
			if icon != "" {
				body["icon"] = icon
			}
			data, err := doRequest("POST", "/api/v1/goals", body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Goal name (required)")
	cmd.Flags().IntVar(&targetAmount, "target", 0, "Target amount in yen (required)")
	cmd.Flags().IntVar(&currentAmount, "current", 0, "Current amount in yen")
	cmd.Flags().StringVar(&deadline, "deadline", "", "Deadline (YYYY-MM-DD)")
	cmd.Flags().StringVar(&color, "color", "", "Color")
	cmd.Flags().StringVar(&icon, "icon", "", "Icon")
	_ = cmd.MarkFlagRequired("name")
	_ = cmd.MarkFlagRequired("target")
	return cmd
}

func newGoalsUpdateCmd() *cobra.Command {
	var (
		name          string
		targetAmount  int
		currentAmount int
		deadline      string
		color         string
		icon          string
		archived      bool
	)
	cmd := &cobra.Command{
		Use:   "update ID",
		Short: "Update goal",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{}
			if cmd.Flags().Changed("name") {
				body["name"] = name
			}
			if cmd.Flags().Changed("target") {
				body["target_amount"] = targetAmount
			}
			if cmd.Flags().Changed("current") {
				body["current_amount"] = currentAmount
			}
			if cmd.Flags().Changed("deadline") {
				body["deadline"] = deadline
			}
			if cmd.Flags().Changed("color") {
				body["color"] = color
			}
			if cmd.Flags().Changed("icon") {
				body["icon"] = icon
			}
			if cmd.Flags().Changed("archived") {
				body["archived"] = archived
			}
			id, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid goal ID: %s", args[0])
			}
			data, err := doRequest("PUT", fmt.Sprintf("/api/v1/goals/%d", id), body)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().StringVar(&name, "name", "", "Goal name")
	cmd.Flags().IntVar(&targetAmount, "target", 0, "Target amount in yen")
	cmd.Flags().IntVar(&currentAmount, "current", 0, "Current amount in yen")
	cmd.Flags().StringVar(&deadline, "deadline", "", "Deadline (YYYY-MM-DD)")
	cmd.Flags().StringVar(&color, "color", "", "Color")
	cmd.Flags().StringVar(&icon, "icon", "", "Icon")
	cmd.Flags().BoolVar(&archived, "archived", false, "Archive the goal")
	return cmd
}

func newGoalsDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete ID",
		Short: "Delete goal",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			id, err := strconv.Atoi(args[0])
			if err != nil {
				return fmt.Errorf("invalid goal ID: %s", args[0])
			}
			_, err = doRequest("DELETE", fmt.Sprintf("/api/v1/goals/%d", id), nil)
			if err != nil {
				return err
			}
			fmt.Println("Deleted.")
			return nil
		},
	}
}
