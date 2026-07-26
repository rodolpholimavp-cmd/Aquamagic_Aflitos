$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

function Find-ExcelPath {
    $fileName = "Base_infos_lavanderia.xlsx"
    $searchRoots = @(
        (Join-Path $env:USERPROFILE "OneDrive"),
        (Join-Path $env:USERPROFILE "OneDrive - Pessoal"),
        (Join-Path $env:USERPROFILE "OneDrive - Personal")
    )

    foreach ($root in $searchRoots) {
        if (-not (Test-Path $root)) { continue }

        $match = Get-ChildItem -Path $root -Recurse -Filter $fileName -ErrorAction SilentlyContinue |
            Select-Object -First 1

        if ($match) {
            return $match.FullName
        }
    }

    return $null
}

Set-Location $projectRoot

Write-Host "Gerando dados a partir da planilha Excel..." -ForegroundColor Cyan

$excelPath = Find-ExcelPath
if (-not $excelPath) {
    Write-Host "Planilha nao encontrada: Base_infos_lavanderia.xlsx" -ForegroundColor Red
    Write-Host "Procurei dentro das pastas OneDrive do usuario." -ForegroundColor Yellow
    exit 1
}

Write-Host "Planilha encontrada:" -ForegroundColor Green
Write-Host $excelPath

python -m pip install openpyxl --quiet
python scripts/export-from-excel.py "$excelPath"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Enviando para o GitHub..." -ForegroundColor Cyan

git add data/dashboard-data.json index.html css js assets
$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteracao para publicar." -ForegroundColor Yellow
    exit 0
}

$hasCode = git diff --cached --name-only | Where-Object { $_ -notmatch "^data/" }
$commitMessage = if ($hasCode) { "Atualiza dashboard (dados e interface)" } else { "Atualiza dados do dashboard" }
git commit -m $commitMessage
git push

Write-Host ""
Write-Host "Site atualizado!" -ForegroundColor Green
Write-Host "Link: https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/" -ForegroundColor Cyan
Write-Host "Aguarde 1-2 minutos e atualize a pagina (F5)."
Write-Host ""
