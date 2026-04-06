package main

import (
	"os"

	"github.com/new-marty/kanjo/internal/cli"
)

func main() {
	if err := cli.Execute(); err != nil {
		os.Exit(1)
	}
}
