$ErrorActionPreference = 'Stop'

$도구폴더 = $PSScriptRoot
$프로젝트폴더 = Split-Path -Parent $도구폴더
$실행스크립트 = Join-Path $도구폴더 '작가 스튜디오 실행.ps1'
$종료스크립트 = Join-Path $도구폴더 '작가 스튜디오 종료.ps1'
$상태파일 = Join-Path $프로젝트폴더 '.실행상태\서버.json'
$윈도우파워셸 = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'

function 확인 {
  param([bool]$조건, [string]$메시지)
  if (-not $조건) { throw $메시지 }
}

if (-not (Test-Path -LiteralPath $실행스크립트)) { throw '작가 스튜디오 실행.ps1 파일이 없습니다.' }
if (-not (Test-Path -LiteralPath $종료스크립트)) { throw '작가 스튜디오 종료.ps1 파일이 없습니다.' }

$env:작가스튜디오_검증 = '1'
try {
  & $윈도우파워셸 -NoProfile -ExecutionPolicy Bypass -File $실행스크립트 -브라우저열지않음
  확인 ($LASTEXITCODE -eq 0) 'Windows PowerShell에서 실행 스크립트를 해석하지 못했습니다.'
  확인 (Test-Path -LiteralPath $상태파일) '첫 실행 뒤 서버 상태 파일이 생성되지 않았습니다.'
  $첫상태 = Get-Content -Raw -LiteralPath $상태파일 | ConvertFrom-Json
  확인 ($첫상태.pid -gt 0) '서버 프로세스 ID가 올바르지 않습니다.'

  & $윈도우파워셸 -NoProfile -ExecutionPolicy Bypass -File $실행스크립트 -브라우저열지않음
  확인 ($LASTEXITCODE -eq 0) 'Windows PowerShell에서 두 번째 실행에 실패했습니다.'
  $둘째상태 = Get-Content -Raw -LiteralPath $상태파일 | ConvertFrom-Json
  확인 ($첫상태.pid -eq $둘째상태.pid) '두 번째 실행에서 서버가 중복 실행됐습니다.'

  $응답 = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5173/' -TimeoutSec 3
  확인 ($응답.StatusCode -eq 200) '앱 주소가 HTTP 200으로 응답하지 않았습니다.'
  확인 ($응답.Content -match '<title>작가 프롬프트 스튜디오</title>') '5173 포트의 응답이 작가 프롬프트 스튜디오가 아닙니다.'
} finally {
  if (Test-Path -LiteralPath $종료스크립트) { & $윈도우파워셸 -NoProfile -ExecutionPolicy Bypass -File $종료스크립트 -알림표시안함 }
  Remove-Item Env:\작가스튜디오_검증 -ErrorAction SilentlyContinue
}

확인 (-not (Get-Process -Id $첫상태.pid -ErrorAction SilentlyContinue)) '종료 스크립트가 서버 프로세스를 종료하지 못했습니다.'
Write-Output '원클릭 실행 검증 통과'
