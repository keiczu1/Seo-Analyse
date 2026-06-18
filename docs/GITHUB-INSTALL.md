# GitHub Install

Цель: поставить `seo-query-brief` в любой проект одной PowerShell-командой, без глобальной установки.

## Default Command

После публикации этого проекта в GitHub как `Keiczu1/Seo-Analyse`:

```powershell
irm https://raw.githubusercontent.com/Keiczu1/Seo-Analyse/main/install.ps1 | iex
```

Команда ставит в текущий проект:

- `skills/seo-query-brief/`
- `tools/seo-query-brief/`
- npm scripts с префиксом `seo:`

## Different Repository Slug

Если репозиторий называется иначе:

```powershell
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO"
```

## Useful Flags

```powershell
# Only install the skill, without CLI tools
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO -SkillOnly"

# Install files but do not run npm install
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO -SkipNpmInstall"

# Use another branch or tag
iex "& { $(irm https://raw.githubusercontent.com/OWNER/REPO/main/install.ps1) } -Repo OWNER/REPO -Ref v1.0.0"
```

## Installed Commands

When optional CLI is installed:

```powershell
npm.cmd run seo:benchmark
npm.cmd run seo:fetch -- G01
npm.cmd run seo:parse -- G01
npm.cmd run seo:analyze:query -- --id G01
npm.cmd run seo:cluster -- --id G01
npm.cmd run seo:brief -- --id G01
npm.cmd run seo:score:brief -- reports/query-<slug>-<date>.md
npm.cmd run seo:test
```

Real XMLRiver credentials still belong in the target project's local environment or `.env`, never in GitHub.

For a new live query, the main command is:

```powershell
npm.cmd run seo:analyze:query -- --id Q01 --query "ваш запрос" --locale ru-RU
```

It writes the final production brief to:

```text
reports/query-<slug>-<date>.md
```

It also writes a separate query-cluster artifact before the brief:

```text
data/clusters/<id>-cluster.json
reports/cluster-<slug>-<date>.md
```

Without external keyword services, the cluster is labeled as `parsed_serp_cluster + synthetic_cluster`, not as keyword-volume data.
