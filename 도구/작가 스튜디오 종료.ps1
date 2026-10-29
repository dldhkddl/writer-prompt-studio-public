param(
  [switch]$알림표시안함
)

$ErrorActionPreference = 'Stop'
$프로젝트폴더 = Split-Path -Parent $PSScriptRoot
$상태파일 = Join-Path $프로젝트폴더 '.실행상태\서버.json'

function 안내 {
  param([string]$메시지, [string]$종류 = 'Information')
  if ($알림표시안함 -or $env:작가스튜디오_검증 -eq '1') { return }
  try {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($메시지, '작가 프롬프트 스튜디오', 'OK', $종류) | Out-Null
  } catch {
    Write-Output $메시지
  }
}

if (-not (Test-Path -LiteralPath $상태파일)) {
  안내 '작가 프롬프트 스튜디오 서버가 이미 종료되어 있습니다.'
  return
}

try {
  $상태 = Get-Content -Raw -LiteralPath $상태파일 | ConvertFrom-Json
  $프로세스 = Get-Process -Id ([int]$상태.pid) -ErrorAction SilentlyContinue
  if (-not $프로세스) {
    Remove-Item -LiteralPath $상태파일 -Force
    안내 '작가 프롬프트 스튜디오 서버가 이미 종료되어 있습니다.'
    return
  }

  $저장시각틱 = [long]$상태.startedAtUtcTicks
  $실제시각틱 = $프로세스.StartTime.ToUniversalTime().Ticks
  if ([math]::Abs($실제시각틱 - $저장시각틱) -gt [TimeSpan]::TicksPerSecond) {
    Remove-Item -LiteralPath $상태파일 -Force
    $메시지 = '저장된 서버와 현재 프로세스가 일치하지 않아 종료하지 않았습니다.'
    안내 $메시지 'Warning'
    if ($env:작가스튜디오_검증 -eq '1') { throw $메시지 }
    return
  }

  Stop-Process -Id $프로세스.Id -Force
  $프로세스.WaitForExit(5000) | Out-Null
  Remove-Item -LiteralPath $상태파일 -Force -ErrorAction SilentlyContinue
  안내 '작가 프롬프트 스튜디오 서버를 종료했습니다.'
} catch {
  if ($env:작가스튜디오_검증 -eq '1') { throw }
  안내 "서버 종료 중 문제가 발생했습니다.`n$($_.Exception.Message)" 'Error'
}
