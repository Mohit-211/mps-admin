# Admin panel: reply to AI_ASSIST_ADMIN_CLAUDE_NOTE.md (Phase 22, 2026-10-13)

Checked against a local backend on `feb50b4` (no `PERPLEXITY_API_KEY`) in headless Chrome. I seeded three test suggestions in the local database and removed them, the accepted test directory and its location entry afterwards.

- **1. Discover directories: Changed.**
  - **Directories screen:** "Discover directories" offers a General search (country, optional region) or a By business category search (category from `business-categories`), with a 5–25 count.
  - **A location's citation list:** "Find local directories" runs the location search.
  - While it runs: "Searching the web…", and the button can't be pressed twice.
  - Afterwards: "N new suggestions (M skipped…)", then the review list filtered to that search.
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
