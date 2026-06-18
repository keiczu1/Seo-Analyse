param(
  [string]$Repo = "Keiczu1/Seo-Analyse",
  [string]$Ref = "main",
  [string]$ProjectPath = (Get-Location).Path,
  [string]$SourcePath = "",
  [switch]$SkillOnly,
  [switch]$NoPackageScripts,
  [switch]$SkipNpmInstall,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Resolve-SafeProjectPath([string]$PathValue) {
  if (-not (Test-Path -LiteralPath $PathValue)) {
    New-Item -ItemType Directory -Force -Path $PathValue | Out-Null
  }
  return (Resolve-Path -LiteralPath $PathValue).Path
}

function Assert-Inside([string]$Base, [string]$Target) {
  $baseFull = (Resolve-SafeProjectPath $Base)
  $targetParent = Split-Path -Parent $Target
  if ($targetParent -and -not (Test-Path -LiteralPath $targetParent)) {
    New-Item -ItemType Directory -Force -Path $targetParent | Out-Null
  }
  $targetFull = [System.IO.Path]::GetFullPath($Target)
  if (-not $targetFull.StartsWith($baseFull, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to write outside project: $targetFull"
  }
}

function Copy-ManagedDirectory([string]$From, [string]$To, [string]$ProjectRoot) {
  if (-not (Test-Path -LiteralPath $From)) {
    throw "Source directory not found: $From"
  }
  Assert-Inside $ProjectRoot $To
  if (Test-Path -LiteralPath $To) {
    Remove-Item -LiteralPath $To -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $To) | Out-Null
  Copy-Item -LiteralPath $From -Destination $To -Recurse -Force
}

function Download-Repository([string]$RepoName, [string]$RefName) {
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("seo-query-brief-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $zip = Join-Path $tmp "repo.zip"
  $urls = @(
    "https://github.com/$RepoName/archive/refs/heads/$RefName.zip",
    "https://github.com/$RepoName/archive/refs/tags/$RefName.zip",
    "https://github.com/$RepoName/archive/$RefName.zip"
  )
  $downloaded = $false
  foreach ($url in $urls) {
    try {
      Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
      $downloaded = $true
      break
    } catch {
      if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
    }
  }
  if (-not $downloaded) {
    throw "Could not download GitHub repository archive for $RepoName@$RefName"
  }
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  $root = Get-ChildItem -LiteralPath $tmp -Directory | Where-Object { $_.Name -ne "__MACOSX" } | Select-Object -First 1
  if (-not $root) {
    throw "Downloaded archive did not contain a repository directory."
  }
  return $root.FullName
}

function Get-SourceRoot() {
  if ($SourcePath) {
    return (Resolve-Path -LiteralPath $SourcePath).Path
  }
  return Download-Repository $Repo $Ref
}

function Get-SkillSource([string]$Root) {
  $distSkill = Join-Path $Root "dist\seo-query-brief-portable\skills\seo-query-brief"
  $plainSkill = Join-Path $Root "skills\seo-query-brief"
  if (Test-Path -LiteralPath (Join-Path $distSkill "SKILL.md")) { return $distSkill }
  if (Test-Path -LiteralPath (Join-Path $plainSkill "SKILL.md")) { return $plainSkill }
  throw "Could not find skills/seo-query-brief/SKILL.md in source."
}

function Get-CliSource([string]$Root) {
  $distCli = Join-Path $Root "dist\seo-query-brief-portable\optional-cli-kit"
  if (Test-Path -LiteralPath (Join-Path $distCli "scripts")) { return $distCli }
  if (Test-Path -LiteralPath (Join-Path $Root "scripts")) { return $Root }
  throw "Could not find optional CLI kit in source."
}

function Copy-CliKit([string]$CliSource, [string]$Target, [string]$ProjectRoot) {
  Assert-Inside $ProjectRoot $Target
  if (Test-Path -LiteralPath $Target) {
    Remove-Item -LiteralPath $Target -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $Target | Out-Null

  $distScripts = Join-Path $CliSource "scripts"
  Copy-Item -LiteralPath $distScripts -Destination (Join-Path $Target "scripts") -Recurse -Force

  $envExample = Join-Path $CliSource ".env.example"
  if (Test-Path -LiteralPath $envExample) {
    Copy-Item -LiteralPath $envExample -Destination (Join-Path $Target ".env.example") -Force
  }

  $distBenchmark = Join-Path $CliSource "data\benchmark\golden-queries.json"
  $rootBenchmark = Join-Path $CliSource "data\benchmark\golden-queries.json"
  if (Test-Path -LiteralPath $distBenchmark) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Target "data\benchmark") | Out-Null
    Copy-Item -LiteralPath $distBenchmark -Destination (Join-Path $Target "data\benchmark\golden-queries.json") -Force
  } elseif (Test-Path -LiteralPath $rootBenchmark) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Target "data\benchmark") | Out-Null
    Copy-Item -LiteralPath $rootBenchmark -Destination (Join-Path $Target "data\benchmark\golden-queries.json") -Force
  }
}

function Set-JsonProperty([object]$Object, [string]$Name, [object]$Value, [bool]$Overwrite) {
  $prop = $Object.PSObject.Properties[$Name]
  if ($prop) {
    if ($Overwrite) { $Object.$Name = $Value }
  } else {
    $Object | Add-Member -MemberType NoteProperty -Name $Name -Value $Value
  }
}

function Update-PackageJson([string]$ProjectRoot, [bool]$Overwrite) {
  $pkgPath = Join-Path $ProjectRoot "package.json"
  if (Test-Path -LiteralPath $pkgPath) {
    $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
  } else {
    $pkg = [pscustomobject]@{
      private = $true
      scripts = [pscustomobject]@{}
      dependencies = [pscustomobject]@{}
    }
  }

  if (-not $pkg.PSObject.Properties["scripts"]) {
    $pkg | Add-Member -MemberType NoteProperty -Name "scripts" -Value ([pscustomobject]@{})
  }
  if (-not $pkg.PSObject.Properties["dependencies"]) {
    $pkg | Add-Member -MemberType NoteProperty -Name "dependencies" -Value ([pscustomobject]@{})
  }

  $scripts = @{
    "seo:fetch" = "node tools/seo-query-brief/scripts/fetch-serp.mjs"
    "seo:parse" = "node tools/seo-query-brief/scripts/hybrid-parser.mjs"
    "seo:analyze:parsed" = "node tools/seo-query-brief/scripts/analyze-parsed-matrix.mjs"
    "seo:analyze:full" = "node tools/seo-query-brief/scripts/generate-full-analysis.mjs"
    "seo:cluster" = "node tools/seo-query-brief/scripts/generate-query-cluster.mjs"
    "seo:brief" = "node tools/seo-query-brief/scripts/generate-query-brief.mjs"
    "seo:score:brief" = "node skills/seo-query-brief/scripts/score-brief.mjs"
    "seo:analyze:query" = "node tools/seo-query-brief/scripts/analyze-query.mjs"
    "seo:benchmark" = "node tools/seo-query-brief/scripts/benchmark-offline.mjs"
    "seo:test" = "npm.cmd run seo:benchmark && npm.cmd run seo:analyze:parsed && npm.cmd run seo:analyze:full && npm.cmd run seo:cluster && npm.cmd run seo:brief"
  }
  foreach ($entry in $scripts.GetEnumerator()) {
    Set-JsonProperty $pkg.scripts $entry.Key $entry.Value $Overwrite
  }

  $dependencies = @{
    "@mozilla/readability" = "^0.6.0"
    "cheerio" = "^1.1.2"
    "fast-xml-parser" = "^5.2.5"
    "jsdom" = "^26.1.0"
    "playwright" = "^1.54.2"
  }
  foreach ($entry in $dependencies.GetEnumerator()) {
    Set-JsonProperty $pkg.dependencies $entry.Key $entry.Value $false
  }

  $json = $pkg | ConvertTo-Json -Depth 20
  Set-Content -LiteralPath $pkgPath -Value $json -Encoding UTF8
}

$projectRoot = Resolve-SafeProjectPath $ProjectPath
$sourceRoot = Get-SourceRoot

$skillSource = Get-SkillSource $sourceRoot
$skillTarget = Join-Path $projectRoot "skills\seo-query-brief"
Copy-ManagedDirectory $skillSource $skillTarget $projectRoot

$cliInstalled = $false
if (-not $SkillOnly) {
  $cliSource = Get-CliSource $sourceRoot
  $cliTarget = Join-Path $projectRoot "tools\seo-query-brief"
  Copy-CliKit $cliSource $cliTarget $projectRoot
  $cliInstalled = $true
  if (-not $NoPackageScripts) {
    Update-PackageJson $projectRoot ([bool]$Force)
  }
}

if ($cliInstalled -and -not $SkipNpmInstall -and (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
  Push-Location $projectRoot
  try {
    npm.cmd install
  } finally {
    Pop-Location
  }
}

Write-Host "seo-query-brief installed into: $skillTarget"
if ($cliInstalled) {
  Write-Host "optional CLI installed into: $(Join-Path $projectRoot 'tools\seo-query-brief')"
  Write-Host "try: npm.cmd run seo:analyze:query -- --id Q01 --query `"your query`" --locale ru-RU"
}
