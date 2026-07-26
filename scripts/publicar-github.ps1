$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataFile = Join-Path $projectRoot "data\dashboard-data.json"

Set-Location $projectRoot

if (-not (Test-Path $dataFile)) {
    Write-Host ""
    Write-Host "Arquivo nao encontrado: data\dashboard-data.json" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Faca isto antes de publicar:"
    Write-Host "  1. Abra index.html no computador"
    Write-Host "  2. Clique em Atualizar Dados e selecione a planilha Excel"
    Write-Host "  3. Clique em Publicar na web"
    Write-Host "  4. Copie o arquivo baixado para: data\dashboard-data.json"
    Write-Host ""
    exit 1
}

$json = Get-Content $dataFile -Raw | ConvertFrom-Json
if (-not $json.transactions -or $json.transactions.Count -eq 0) {
    Write-Host "O arquivo data\dashboard-data.json esta vazio. Carregue a planilha e publique de novo." -ForegroundColor Yellow
    exit 1
}

Write-Host "Publicando $($json.transactions.Count) vendas no GitHub..." -ForegroundColor Cyan

git add -A
$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteracao para enviar." -ForegroundColor Yellow
    exit 0
}

git commit -m "Atualiza dados do dashboard"
git push

Write-Host ""
Write-Host "Publicado com sucesso!" -ForegroundColor Green
Write-Host "Link para seus socios:"
Write-Host "  https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/" -ForegroundColor Cyan
Write-Host ""
Write-Host "Aguarde 1 a 2 minutos e peca para atualizarem a pagina (F5)."
Write-Host ""
