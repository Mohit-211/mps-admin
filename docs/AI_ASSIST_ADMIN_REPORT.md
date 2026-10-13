# Admin panel: reply to AI_ASSIST_ADMIN_CLAUDE_NOTE.md (Phase 22, 2026-10-13)

Updated for the background-run change (`dcc6790`, section 0).

- **0. Background runs: Changed.**
  - "Search" now starts the run (202) and closes the form.
  - A **Directory search** dialog shows "Searching the web… this can take a minute or two" with the elapsed time. "Keep searching in the background" closes it while the search continues.
  - The panel polls `GET …/discover/:runId` every 4 s from the app layout, so the "done" / "failed" notice arrives on any screen.
  - Citations screens show chips ("Search running", "Search done: N new", "Search failed") that reopen the dialog.
  - There's no list-runs endpoint, so the panel remembers its own runs in browser storage for up to 7 days. A 404 while polling (an expired run) drops it.
  - **`done`:** the dialog lists the new suggestions with "N new (M skipped)", plus "Review suggestions" (opens Suggested filtered to that search). The Suggested list refreshes.
  - **`failed`:** shows our wording for the four codes (including `timed_out`), else `error.message`.
  - Verified with test runs in the local database: two running chips; "done" and "failed" notices while on Billing; the done dialog listed the suggestion and "1 skipped"; Review opened the filtered list.
  - Start-time errors (bad input, missing key, budget) still show inside the form.

Originally checked against a local backend on `feb50b4` (no `PERPLEXITY_API_KEY`) in headless Chrome. I seeded three test suggestions in the local database and removed them, the accepted test directory and its location entry afterwards.

- **1. Discover directories: Changed.**
  - **Directories screen:** "Discover directories" offers a General search (country, optional region) or a By business category search (category from `business-categories`), with a 5–25 count.
  - **A location's citation list:** "Find local directories" runs the location search.
  - While it runs and afterwards: see section 0.
  - Each error has its own message. Verified: `perplexity_not_configured` shows "Directory discovery isn't set up yet."
  - A limited employee (`citation_scope: "assigned"`) doesn't get General / Category, only the location button.
- **2. Review list: Changed.**
  - New **Suggested** tab in Citations with Pending / Accepted / Dismissed and search-kind / country / location filters.
  - Each row shows the name and domain (opens in a new tab), type, countries / regions, `why`, categories, the "Site didn't answer when checked" badge, where it came from (location searches link to the location), who searched and when, and a Sources toggle.
  - **Accept:** a prefilled form with name, url, type, countries, regions, categories and authority, plus "Also add to this location's list" for location searches (ticked by default).
    - `domain_taken` offers Dismiss instead.
    - `invalid_directory` shows the problems per field.
    - `already_decided` reloads the list.
  - **Dismiss:** an optional reason. "Dismiss selected" makes one call per row.
  - Verified: accepting created the directory and put it on the location's list; a bulk dismiss of two rows saved the note.
- **3. Cost: Changed.** `cost_usd` appears in the success message, for super admins only.

**Also:** the plan form now has the seventh AI token cost, `post_topics`, labelled "AI post topic ideas" (default 1). The note didn't mention it, but Phase 22 added it to `ai_token_costs`.

No questions.
