package cli

import (
	"github.com/spf13/cobra"
)

func newRootCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "kanjo",
		Short: "Kanjo CLI — personal finance from the terminal",
	}

	cmd.AddCommand(
		newHealthCmd(),
		newDashboardCmd(),
		newNetWorthCmd(),
		newMonthlySummaryCmd(),
		newCashFlowCmd(),
		newSpendingByCategoryCmd(),
		newSpendingPaceCmd(),
		newAssetCompositionCmd(),
		newAssetTrendCmd(),
		newDailyRankingsCmd(),
		newTransactionsCmd(),
		newBudgetsCmd(),
		newGoalsCmd(),
		newChatCmd(),
		newInsightsCmd(),
		newInstitutionsCmd(),
		newSettingsCmd(),
		newSyncCmd(),
	)

	return cmd
}

// Execute runs the root command.
func Execute() error {
	return newRootCmd().Execute()
}
