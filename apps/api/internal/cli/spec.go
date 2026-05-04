package cli

import (
	"fmt"

	"github.com/spf13/cobra"
)

func newOpenAPICmd() *cobra.Command {
	return &cobra.Command{
		Use:   "openapi",
		Short: "Print the OpenAPI 3 spec (JSON)",
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet("/openapi.json", nil)
			if err != nil {
				return err
			}
			fmt.Println(string(data))
			return nil
		},
	}
}

func newToolsCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "tools",
		Short: "Export LLM tool manifests for AI agent integration",
	}
	cmd.AddCommand(
		&cobra.Command{
			Use:   "openai",
			Short: "Print the OpenAI-shaped tool manifest",
			RunE: func(cmd *cobra.Command, args []string) error {
				data, err := doGet("/tools/openai.json", nil)
				if err != nil {
					return err
				}
				fmt.Println(string(data))
				return nil
			},
		},
		&cobra.Command{
			Use:   "anthropic",
			Short: "Print the Anthropic-shaped tool manifest",
			RunE: func(cmd *cobra.Command, args []string) error {
				data, err := doGet("/tools/anthropic.json", nil)
				if err != nil {
					return err
				}
				fmt.Println(string(data))
				return nil
			},
		},
	)
	return cmd
}
