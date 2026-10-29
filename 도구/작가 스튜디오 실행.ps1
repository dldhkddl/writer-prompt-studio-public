param(
  [switch]$브라우저열지않음
)

$ErrorActionPreference = 'Stop'
$프로젝트폴더 = Split-Path -Parent $PSScriptRoot
$앱주소 = 'http://127.0.0.1:5173/'
$상태폴더 = Join-Path $프로젝트폴더 '.실행상태'
$상태파일 = Join-Path $상태폴더 '서버.json'
$출력로그 = Join-Path $상태폴더 '서버-출력.log'
$오류로그 = Join-Path $상태폴더 '서버-오류.log'

function 앱실행중 {
  try {
    $응답 = Invoke-RestMethod -UseBasicParsing -Uri "$($앱주소)api/health" -TimeoutSec 2
    return $응답.app -eq 'writer-prompt-studio'
  } catch {
    return $false
  }
}

function 포트사용중 {
  $클라이언트 = [System.Net.Sockets.TcpClient]::new()
  try {
    $연결 = $클라이언트.BeginConnect('127.0.0.1', 5173, $null, $null)
    if (-not $연결.AsyncWaitHandle.WaitOne(700)) { return $false }
    $클라이언트.EndConnect($연결)
    return $true
  } catch {
    return $false
  } finally {
    $클라이언트.Dispose()
  }
}

function 오류알림 {
  param([string]$메시지)
  if ($env:작가스튜디오_검증 -eq '1') { return }
  try {
    Add-Type -AssemblyName PresentationFramework
    [System.Windows.MessageBox]::Show($메시지, '작가 프롬프트 스튜디오', 'OK', 'Error') | Out-Null
  } catch {
    Write-Error $메시지
  }
}

$시작프로세스 = $null
try {
  if (앱실행중) {
    if (-not $브라우저열지않음) { Start-Process -FilePath $앱주소 | Out-Null }
    return
  }

  if (포트사용중) {
    throw '5173 포트를 다른 프로그램이 사용 중입니다. 해당 프로그램을 종료한 뒤 다시 실행해주세요.'
  }

  $노드경로 = (Get-Command node -ErrorAction Stop).Source
  $바이트경로 = Join-Path $프로젝트폴더 'node_modules\vite\bin\vite.js'
  if (-not (Test-Path -LiteralPath $바이트경로)) {
    throw '필요한 실행 파일을 찾을 수 없습니다. 프로젝트 폴더에서 npm install을 먼저 실행해주세요.'
  }

  New-Item -ItemType Directory -Path $상태폴더 -Force | Out-Null
  $시작프로세스 = Start-Process -FilePath $노드경로 `
    -ArgumentList @("`"$바이트경로`"", '--host', '127.0.0.1', '--port', '5173', '--strictPort') `
    -WorkingDirectory $프로젝트폴더 -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $출력로그 -RedirectStandardError $오류로그
  $시작프로세스 = Get-Process -Id $시작프로세스.Id

  [pscustomobject]@{
    pid = $시작프로세스.Id
    startedAtUtcTicks = $시작프로세스.StartTime.ToUniversalTime().Ticks
  } | ConvertTo-Json | Set-Content -LiteralPath $상태파일 -Encoding utf8

  $준비기한 = [System.Diagnostics.Stopwatch]::StartNew()
  while ($준비기한.Elapsed.TotalSeconds -lt 20) {
    if (앱실행중) {
      if (-not $브라우저열지않음) { Start-Process -FilePath $앱주소 | Out-Null }
      return
    }
    if ($시작프로세스.HasExited) { break }
    Start-Sleep -Milliseconds 250
    $시작프로세스.Refresh()
  }

  throw "서버가 20초 안에 시작되지 않았습니다.`n오류 기록: $오류로그"
} catch {
  if ($시작프로세스 -and -not $시작프로세스.HasExited) {
    Stop-Process -Id $시작프로세스.Id -Force -ErrorAction SilentlyContinue
  }
  Remove-Item -LiteralPath $상태파일 -Force -ErrorAction SilentlyContinue
  오류알림 $_.Exception.Message
  if ($env:작가스튜디오_검증 -eq '1') { throw }
}
