package main

import (
	"log"

	"github.com/castrojo/cncf-darkmode/internal/endusers"
)

func main() {
	if err := endusers.Sync(); err != nil {
		log.Fatalf("sync-endusers: %v", err)
	}
}
