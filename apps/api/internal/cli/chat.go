package cli

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"

	"github.com/spf13/cobra"
)

func newChatCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "chat",
		Short: "AI chat and conversations",
	}
	cmd.AddCommand(
		newChatSendCmd(),
		newChatListCmd(),
		newChatGetCmd(),
		newChatDeleteCmd(),
	)
	return cmd
}

func newChatSendCmd() *cobra.Command {
	var (
		conversationID string
		model          string
	)
	cmd := &cobra.Command{
		Use:   "send MESSAGE",
		Short: "Chat with AI assistant (streams response)",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			body := map[string]any{
				"message": args[0],
			}
			if conversationID != "" {
				body["conversation_id"] = conversationID
			}
			if model != "" {
				body["model"] = model
			}

			// SSE streaming — use raw request instead of doRequest
			reqBody, _ := json.Marshal(body)
			req, err := http.NewRequest("POST", apiURL()+"/api/v1/chat", bytes.NewReader(reqBody))
			if err != nil {
				return err
			}
			req.Header.Set("Content-Type", "application/json")
			resp, err := httpClient.Do(req)
			if err != nil {
				return err
			}
			defer resp.Body.Close() //nolint:errcheck

			scanner := bufio.NewScanner(resp.Body)
			for scanner.Scan() {
				line := scanner.Text()
				fmt.Println(line)
			}
			return scanner.Err()
		},
	}
	cmd.Flags().StringVar(&conversationID, "conversation", "", "Conversation ID to continue")
	cmd.Flags().StringVar(&model, "model", "", "LLM model to use")
	return cmd
}

func newChatListCmd() *cobra.Command {
	var limit int
	cmd := &cobra.Command{
		Use:   "list",
		Short: "List conversations",
		RunE: func(cmd *cobra.Command, args []string) error {
			q := url.Values{}
			if limit > 0 {
				q.Set("limit", strconv.Itoa(limit))
			}
			data, err := doGet("/api/v1/chat/conversations", q)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
	cmd.Flags().IntVar(&limit, "limit", 0, "Number of results (default: 20)")
	return cmd
}

func newChatGetCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "get ID",
		Short: "Get conversation",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doGet(fmt.Sprintf("/api/v1/chat/conversations/%s", args[0]), nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}

func newChatDeleteCmd() *cobra.Command {
	return &cobra.Command{
		Use:   "delete ID",
		Short: "Delete conversation",
		Args:  cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			data, err := doRequest("DELETE", fmt.Sprintf("/api/v1/chat/conversations/%s", args[0]), nil)
			if err != nil {
				return err
			}
			printJSON(data)
			return nil
		},
	}
}
