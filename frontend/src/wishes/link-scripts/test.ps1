# Runs both link scripts against a made-up user folder and game, as CI does on Windows, in
# Windows PowerShell 5.1 and PowerShell 7. The scripts take the user folder from USERPROFILE,
# so the real one is never read.
$ErrorActionPreference = 'Stop'
$failures = 0
function Expect([string] $Name, [bool] $Ok) {
  if ($Ok) { Write-Output "ok: $Name" } else { Write-Output "FAILED: $Name"; $script:failures++ }
}
function Run([string] $Script, [string] $UserFolder) {
  $saved = $env:USERPROFILE
  $env:USERPROFILE = $UserFolder
  # Run as a player runs it: the text pasted into PowerShell, not the file.
  $text = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $Script), [Text.Encoding]::UTF8)
  try { (& ([scriptblock]::Create($text)) 6>&1 | Out-String) } finally { $env:USERPROFILE = $saved }
}
function Write-Fake([string] $Path, [string] $Text) {
  New-Item -ItemType Directory -Force -Path (Split-Path $Path) | Out-Null
  [IO.File]::WriteAllText($Path, $Text)
}

$games = @(
  @{ Script = 'genshin.ps1'; Log = 'AppData\LocalLow\miHoYo\Genshin Impact\output_log.txt';
     Data = 'GenshinImpact_Data'; Biz = 'hk4e_global'
     Page = 'https://webstatic-sea.hoyoverse.com/genshin/event/e20190909gacha-v3/index.html' },
  @{ Script = 'starrail.ps1'; Log = 'AppData\LocalLow\Cognosphere\Star Rail\Player.log';
     Data = 'StarRail_Data'; Biz = 'hkrpg_global'
     Page = 'https://gs.hoyoverse.com/hkrpg/event/e20211215gacha-v2/index.html' }
)
foreach ($game in $games) {
  $root = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid())
  $user = Join-Path $root 'user'
  New-Item -ItemType Directory -Force -Path $user | Out-Null
  $name = $game.Script

  Expect "$name says when the game never ran" ((Run $name $user) -match 'log was not found')

  $data = Join-Path $root "Game\$($game.Data)"
  $log = Join-Path $user $game.Log
  Write-Fake $log "Loading player data from $($data.Replace('\', '/'))/data.unity3d`n"
  Expect "$name says when the history was never opened" ((Run $name $user) -match 'No link found')

  $link = { param($key) "$($game.Page)?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&lang=en&authkey=$key&game_biz=$($game.Biz)" }
  # An older cache folder and a newer one, each with binary noise around its links.
  $old = Join-Path $data 'webCaches\2.30.0.0\Cache\Cache_Data\data_2'
  $new = Join-Path $data 'webCaches\2.31.0.0\Cache\Cache_Data\data_2'
  $noise = "`0$([char]1)$([char]200)`0"
  Write-Fake $old "$noise$(& $link 'OLD')$noise"
  Write-Fake $new "$noise$(& $link 'FIRST')$noise$(& $link 'NEWEST')$noise"
  (Get-Item $old).LastWriteTime = (Get-Date).AddDays(-1)
  $before = @(Get-ChildItem -Recurse -Force $root).Count
  $out = Run $name $user
  Expect "$name prints the newest link of the newest cache" ($out.Contains((& $link 'NEWEST')))
  Expect "$name prints no other link" (-not ($out -match 'authkey=(OLD|FIRST)'))
  Expect "$name writes no file" ((@(Get-ChildItem -Recurse -Force $root).Count) -eq $before)

  Remove-Item -Recurse -Force $root
}
if ($failures) { throw "$failures check(s) failed" }
