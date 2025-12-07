param(
    [string]$SiteId = "demo-ar-heritage-site",
    [switch]$Prod
)

if (-not (Get-Command "netlify" -ErrorAction SilentlyContinue)) {
    Write-Error "Netlify CLI chưa được cài. Chạy 'npm install -g netlify-cli'."
    exit 1
}

$deployArgs = @("deploy", "--dir=.", "--site=$SiteId")
if ($Prod) {
    $deployArgs += "--prod"
}

netlify @deployArgs
