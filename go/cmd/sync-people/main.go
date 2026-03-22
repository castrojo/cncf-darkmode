package main

import (
	"log"

	"github.com/castrojo/cncf-darkmode/internal/people"
)

func main() {
	if err := people.Sync(); err != nil {
		log.Fatalf("sync-people: %v", err)
	}
}
