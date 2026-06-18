# Source Catalog

Source refresh verifies source-sensitive facts against official or primary URLs.

Create one JSON file per query:

```text
data/source-catalog/<queryId>.json
```

Each file maps `sourcePlan.facts[].id` to official-source candidates:

```json
{
  "queryId": "Q01",
  "facts": {
    "core_claims": {
      "minimumVerifiedSources": 1,
      "candidates": [
        {
          "id": "official_page",
          "source": "Official source name",
          "authorityType": "official",
          "url": "https://example.gov/page",
          "termGroups": [
            ["required term variant", "another variant"],
            ["second required concept"]
          ]
        }
      ]
    }
  }
}
```

Rules:

- Use official, regulator, standards-body, vendor, or primary documentation URLs.
- Competitors can inform the page brief, but they do not verify source-sensitive facts.
- `termGroups` are AND groups: every group must match at least one term.
- Keep query-specific URLs in this folder, not hardcoded in scripts.
