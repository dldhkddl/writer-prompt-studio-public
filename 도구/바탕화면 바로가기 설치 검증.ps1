$ErrorActionPreference = 'Stop'

$도구폴더 = $PSScriptRoot
$프로젝트폴더 = Split-Path -Parent $도구폴더
$설치스크립트 = Join-Path $도구폴더 '바탕화면 바로가기 설치.ps1'
$실행스크립트 = Join-Path $도구폴더 '작가 스튜디오 실행.ps1'
$종료스크립트 = Join-Path $도구폴더 '작가 스튜디오 종료.ps1'
$임시폴더 = Join-Path ([System.IO.Path]::GetTempPath()) ("작가-바로가기-검증-$([guid]::NewGuid().ToString('N'))")
$실행바로가기 = Join-Path $임시폴더 '작가 프롬프트 스튜디오.lnk'
$종료바로가기 = Join-Path $임시폴더 '작가 프롬프트 스튜디오 종료.lnk'

function 확인 {
  param([bool]$조건, [string]$메시지)
  if (-not $조건) { throw $메시지 }
}

if (-not (Test-Path -LiteralPath $설치스크립트)) { throw '바탕화면 바로가기 설치.ps1 파일이 없습니다.' }

New-Item -ItemType Directory -Path $임시폴더 | Out-Null
try {
  & $설치스크립트 -대상폴더 $임시폴더 | Out-Null
  확인 (Test-Path -LiteralPath $실행바로가기) '실행 바로가기가 생성되지 않았습니다.'
  확인 (Test-Path -LiteralPath $종료바로가기) '종료 바로가기가 생성되지 않았습니다.'

  $셸 = New-Object -ComObject WScript.Shell
  $실행정보 = $셸.CreateShortcut($실행바로가기)
  $종료정보 = $셸.CreateShortcut($종료바로가기)
  확인 ($실행정보.Arguments -match [regex]::Escape($실행스크립트)) '실행 바로가기 대상 스크립트가 올바르지 않습니다.'
  확인 ($종료정보.Arguments -match [regex]::Escape($종료스크립트)) '종료 바로가기 대상 스크립트가 올바르지 않습니다.'
  확인 ($실행정보.WorkingDirectory -eq $프로젝트폴더) '실행 바로가기 작업 폴더가 올바르지 않습니다.'
  확인 ($종료정보.WorkingDirectory -eq $프로젝트폴더) '종료 바로가기 작업 폴더가 올바르지 않습니다.'
  확인 (Test-Path -LiteralPath $실행정보.TargetPath) '바로가기가 존재하지 않는 PowerShell을 가리킵니다.'
} finally {
  Remove-Item -LiteralPath $실행바로가기 -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $종료바로가기 -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $임시폴더 -Force -ErrorAction SilentlyContinue
}

Write-Output '바탕화면 바로가기 설치 검증 통과'
