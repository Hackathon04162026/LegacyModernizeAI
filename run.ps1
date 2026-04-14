param(
    [ValidateSet("demo", "dev")]
    [string]$Mode = "dev"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$nodeRoot = Join-Path $repoRoot "tools\node"
$nodeExe = Join-Path $nodeRoot "node.exe"
$npmCmd = Join-Path $nodeRoot "npm.cmd"

if (-not (Test-Path $nodeExe) -or -not (Test-Path $npmCmd)) {
    Write-Error "Portable Node runtime not found under tools\node. Install it first or run with a global Node.js installation."
}

$env:Path = "$nodeRoot;$env:Path"
Set-Location $repoRoot

Write-Host "Using repo:" $repoRoot
Write-Host "Mode:" $Mode

function Open-UrlInBackground {
    param(
        [string]$Url,
        [int]$DelaySeconds = 4
    )

    Start-Process powershell -ArgumentList "-WindowStyle", "Hidden", "-Command", "Start-Sleep -Seconds $DelaySeconds; Start-Process '$Url'" | Out-Null
}

if ($Mode -eq "demo") {
    Write-Host "Installing dependencies if needed..."
    & $npmCmd install

    Write-Host "Building frontend..."
    & $npmCmd run build

    Write-Host "Starting API on http://localhost:4000 ..."
    Write-Host "Opening http://localhost:4000 after the server starts."
    Open-UrlInBackground -Url "http://localhost:4000" -DelaySeconds 5
    & $npmCmd run dev:api
    exit $LASTEXITCODE
}

Write-Host "Installing dependencies if needed..."
& $npmCmd install

Write-Host "Starting API in a new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot'; `$env:Path='$nodeRoot;' + `$env:Path; & '$npmCmd' run dev:api"

Write-Host "Starting web app in a new PowerShell window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$repoRoot'; `$env:Path='$nodeRoot;' + `$env:Path; & '$npmCmd' run dev:web"
Open-UrlInBackground -Url "http://localhost:5173" -DelaySeconds 6

Write-Host ""
Write-Host "Dev mode started."
Write-Host "API: http://localhost:4000"
Write-Host "Web: http://localhost:5173"
