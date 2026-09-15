SplitTrip V2

How to run:
1. Open index.html in Chrome/Edge, or publish the files on GitHub Pages.
2. On first visit, the user is asked to enter their own name.
3. The profile name can be edited later from the profile card.
4. Data is stored in browser Local Storage.

Important V2 changes:
- No Hassan/default person is hardcoded into new trips.
- The current user's chosen profile name is included when they create a trip.
- Changing the profile name updates that user's name across their existing trips, expenses and settlements.
- Fresh V2 starts with no demo trips.
- Google Analytics 4 is connected with Measurement ID G-WDHB6ETLJE.
- Product events: profile_created, profile_updated, trip_created, member_added, expense_added, settlement_created, settlement_confirmed.
- Analytics events do not send member names, trip names, expense names, or settlement parties.

Supported currencies:
EGP, SAR, USD, INR

Core product rule:
Payments are NEVER automatically divided among trip members.
Consumption is calculated only from the items explicitly assigned to each person.


Mobile UI update:
- Sticky compact mobile header
- 4-column navigation that fits the screen
- Responsive trip tabs
- Better action-button wrapping
- Single-column cards/forms on mobile
- Mobile-friendly tables and bottom-sheet modals
- 16px form inputs to avoid mobile browser zoom
