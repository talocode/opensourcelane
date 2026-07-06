# OpenSourceLane Windows installer
$Version = if ($env:VERSION) { $env:VERSION } else { "0.1.0" }

Write-Host "OpenSourceLane installer v$Version"
Write-Host "Installing via npm (Node.js launcher)..."

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is required. Install Node.js 18+ first."
    exit 1
}

npm install -g "@talocode/opensourcelane@$Version"
Write-Host "Installed. Run: opensourcelane --help"
Write-Host "Sponsor: https://github.com/sponsors/Abdulmuiz44"