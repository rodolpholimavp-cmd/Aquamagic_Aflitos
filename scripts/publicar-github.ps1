$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$excelPath = "C:\Users\rodol\OneDrive\Área de Trabalho\Projeto Cursor\Projeto Lavanderia\Base_infos_lavanderia.xlsx"

Set-Location $projectRoot

Write-Host "Gerando dados a partir da planilha Excel..." -ForegroundColor Cyan

if (-not (Test-Path $excelPath)) {
    Write-Host "Planilha nao encontrada:" -ForegroundColor Red
    Write-Host $excelPath
    exit 1
}

python -m pip install openpyxl --quiet
python scripts/export-from-excel.py $excelPath
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "Enviando para o GitHub..." -ForegroundColor Cyan

git add data/dashboard-data.json
$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteracao nos dados." -ForegroundColor Yellow
    exit 0
}

git commit -m "Atualiza dados do dashboard"
git push

Write-Host ""
Write-Host "Site atualizado!" -ForegroundColor Green
Write-Host "Link: https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/" -ForegroundColor Cyan
Write-Host "Aguarde 1-2 minutos e atualize a pagina (F5)."
Write-Host ""
