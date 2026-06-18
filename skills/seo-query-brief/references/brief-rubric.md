# Brief Rubric

Score each criterion from 0 to 2. Maximum: 40.

| Criterion | 0 | 1 | 2 |
|---|---|---|---|
| Intent fit | wrong intent | partial | dominant and secondary intents are clear |
| Page type | generic guide | partially suitable | format matches user task |
| First screen | generic intro | partly useful | immediately serves the main intent |
| Modules | random modules | partly right | modules follow from intent and SERP |
| Executive synthesis | absent | repeats raw analysis | clear page decision, content line, blockers, and what can be built |
| Outline specificity | universal | partly specific | each section has a job, coverage requirements, source checks, and acceptance criteria |
| SERP discipline | invents SERP | separates hypotheses | explicitly uses evidence mode |
| SERP features | absent or invented | provider limits mentioned | feature availability, zero-click risk, and limitations are explicit |
| Differentiating value | "add FAQ" | weak | concrete data, method, tool, or source |
| Entity map | absent or keyword dump | partial entities | primary entity, attributes, relations, authority/risk/excluded entities are clear |
| Query cluster | absent | weak include/exclude list | one-page vs split/hub decision, exclusions, and split candidates are clear |
| Meta suggestions | absent or generic | title/description without basis | variants are tied to entity, intent, modules, SERP patterns, and trust limits |
| Source plan | absent | generic source note | facts, preferred sources, status, reviewer flag, and visible source blocks are clear |
| Source refresh | absent when required | URLs listed without verification status | official URLs are checked, fact statuses are explicit, reviewer gate is preserved |
| Publication review | absent when required | partial safety/status review | final candidate status, unsafe-claim checks, schema limits, and no-fake-review rule are explicit |
| Implementation contract | prose only | partial components | visible components, states/fields, acceptance tests, and schema dependencies are clear |
| Trust/freshness | ignored | partial | explicit source/date/expert requirements |
| Editor handoff | generic style notes | partial | author can write each section without reading raw JSON |
| Technical brief | vague | partial | frontend developer sees components, states, visibility, and acceptance criteria |
| Guardrails | ranking promises or schema magic | minor risks | cautious and accurate |

Pass levels:

- 38-40: production workflow ready
- 32-37: usable after targeted revision
- 24-31: unstable
- below 24: redo the brief

Critical fail regardless of score:

- one outline template for different intents
- schema for invisible content
- guaranteed ranking claims
- YMYL without source/expert/freshness requirements
- source-sensitive page without source plan
- required source refresh left unresolved while the brief is called final
- technical analysis dump presented as final production brief
- outline with only H2 labels and no section-level requirements
- implementation contract without component specs or states where relevant
- human medical/legal/financial expert review claimed without a real qualified reviewer
- production brief without implementation contract
- title/description generated without visible-content basis
- entity map absent from a production brief
- query cluster absent from a production brief
- raw SERP headings, typos, slogans, or competitor brand text treated as normalized keywords
- niche-specific hardcoded cluster/outline used instead of query analysis
- SERP claims without SERP evidence
- fallback data presented as full parsed SERP analysis
- competitor structure copied as the main method
