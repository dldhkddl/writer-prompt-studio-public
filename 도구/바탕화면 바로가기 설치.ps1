param(
  [string]$대상폴더 = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'
$도구폴더 = $PSScriptRoot
$프로젝트폴더 = Split-Path -Parent $도구폴더
$실행스크립트 = Join-Path $도구폴더 '작가 스튜디오 실행.ps1'
$종료스크립트 = Join-Path $도구폴더 '작가 스튜디오 종료.ps1'
$윈도우파워셸 = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$파워셸경로 = if (Test-Path -LiteralPath $윈도우파워셸) { $윈도우파워셸 } else { (Get-Command pwsh -ErrorAction Stop).Source }

if (-not (Test-Path -LiteralPath $실행스크립트)) { throw "실행 스크립트를 찾을 수 없습니다: $실행스크립트" }
if (-not (Test-Path -LiteralPath $종료스크립트)) { throw "종료 스크립트를 찾을 수 없습니다: $종료스크립트" }
if (-not (Test-Path -LiteralPath $대상폴더)) { New-Item -ItemType Directory -Path $대상폴더 | Out-Null }

$셸 = New-Object -ComObject WScript.Shell

function 바로가기만들기 {
  param(
    [string]$이름,
    [string]$스크립트,
    [string]$설명,
    [int]$아이콘번호
  )

  $바로가기경로 = Join-Path $대상폴더 "$이름.lnk"
  $바로가기 = $셸.CreateShortcut($바로가기경로)
  $바로가기.TargetPath = $파워셸경로
  $바로가기.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$스크립트`""
  $바로가기.WorkingDirectory = $프로젝트폴더
  $바로가기.Description = $설명
  $바로가기.IconLocation = "$env:SystemRoot\System32\shell32.dll,$아이콘번호"
  $바로가기.Save()
  return $바로가기경로
}

$실행바로가기 = 바로가기만들기 '작가 프롬프트 스튜디오' $실행스크립트 '작가 프롬프트 스튜디오 실행' 220
$종료바로가기 = 바로가기만들기 '작가 프롬프트 스튜디오 종료' $종료스크립트 '작가 프롬프트 스튜디오 서버 종료' 131

Write-Output $실행바로가기
Write-Output $종료바로가기
