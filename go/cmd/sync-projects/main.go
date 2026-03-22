package main

import (
	"log"

	"github.com/castrojo/cncf-darkmode/internal/projects"
)

func main() {
	if err := projects.Sync(); err != nil {
		log.Fatalf("sync-projects: %v", err)
	}
}
