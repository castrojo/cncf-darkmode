package people

import (
	"fmt"
	"reflect"
	"time"

	"github.com/google/uuid"
)

// firstRunPeopleCap limits how many people are bootstrapped as "added" events
// on the very first run (empty previous state).
const firstRunPeopleCap = 5000

// Compute returns the list of events representing the delta between
// previous and current people maps.
func Compute(previous, current map[string]RawPerson, now time.Time) []Event {
	var events []Event

	// Added: in current but not in previous
	added := []Event{}
	for handle, person := range current {
		if _, exists := previous[handle]; !exists {
			added = append(added, Event{
				ID:        uuid.New().String(),
				Type:      EventAdded,
				Timestamp: now,
				Person:    person.ToSafe(),
			})
		}
	}

	// Cap first-run people flood
	if len(previous) == 0 && len(added) > firstRunPeopleCap {
		added = added[:firstRunPeopleCap]
	}
	events = append(events, added...)

	// Removed: in previous but not in current
	for handle, person := range previous {
		if _, exists := current[handle]; !exists {
			events = append(events, Event{
				ID:        uuid.New().String(),
				Type:      EventRemoved,
				Timestamp: now,
				Person:    person.ToSafe(),
			})
		}
	}

	// Updated: in both, but safe fields changed
	for handle, newPerson := range current {
		oldPerson, exists := previous[handle]
		if !exists {
			continue
		}
		changes := diffPersons(oldPerson, newPerson)
		if len(changes) > 0 {
			events = append(events, Event{
				ID:        uuid.New().String(),
				Type:      EventUpdated,
				Timestamp: now,
				Person:    newPerson.ToSafe(),
				Changes:   changes,
			})
		}
	}

	return events
}

// safeFields lists the RawPerson fields we track for changes (excludes email/wechat/sensitive).
var safeFields = []string{"Name", "Company", "Location", "LinkedIn", "Twitter", "GitHub", "Image", "Bluesky", "Website"}

func diffPersons(old, newP RawPerson) []FieldChange {
	oldVal := reflect.ValueOf(old)
	newVal := reflect.ValueOf(newP)

	var changes []FieldChange
	for _, field := range safeFields {
		oldF := fmt.Sprintf("%v", oldVal.FieldByName(field).Interface())
		newF := fmt.Sprintf("%v", newVal.FieldByName(field).Interface())
		if oldF != newF {
			changes = append(changes, FieldChange{
				Field: field,
				From:  oldF,
				To:    newF,
			})
		}
	}
	return changes
}
