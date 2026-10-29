$ErrorActionPreference = 'Stop'
$destino = $PSScriptRoot
$origens = @(
  'C:\Users\DELL\Downloads\PrecoMobi_Teste_Local_Sem_Reconfigurar\precomobi-completo',
  'C:\Users\DELL\Downloads\precomobi-completo'
)
foreach ($relativo in @('backend\.env', 'frontend\.env')) {
  $destinoArquivo = Join-Path $destino $relativo
  if (Test-Path -LiteralPath $destinoArquivo) {
    Write-Host "Configuracao local preservada: $relativo"
    continue
  }
  $achou = $false
  foreach ($origem in $origens) {
    $origemArquivo = Join-Path $origem $relativo
    if (Test-Path -LiteralPath $origemArquivo) {
      Copy-Item -LiteralPath $origemArquivo -Destination $destinoArquivo -ErrorAction Stop
      Write-Host "Configuracao local reutilizada: $relativo"
      $achou = $true
      break
    }
  }
  if (-not $achou) { throw "Arquivo $relativo nao encontrado. Copie-o da sua instalacao local de testes, sem divulgar o conteudo." }
}
