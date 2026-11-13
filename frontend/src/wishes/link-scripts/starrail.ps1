# HoYo Toolkit: finds the Honkai: Star Rail warp history link on this PC. / Находит ссылку на историю прыжков Honkai: Star Rail.
# It reads two of the game's own files and prints the link. It sends nothing over the network and
# writes no file itself; it copies the link to the clipboard.
& {
  $ErrorActionPreference = 'Stop'
  function Read-Shared([string] $Path) {
    # The game keeps its files open while it runs: read them without locking them.
    $stream = [IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
    try { (New-Object IO.StreamReader($stream)).ReadToEnd() } finally { $stream.Dispose() }
  }
  $log = Join-Path $env:USERPROFILE 'AppData\LocalLow\Cognosphere\Star Rail\Player.log'
  if (-not (Test-Path -LiteralPath $log)) {
    Write-Host 'The game log was not found: start the game on this PC once.'
    Write-Host 'Журнал игры не найден: запустите игру на этом ПК.'
    return
  }
  # The game writes its own folder into the log, as C:/.../StarRail_Data/.
  $game = [regex]::Match((Read-Shared $log), '(?i)\w:/.*?/StarRail_Data/')
  if (-not $game.Success) {
    Write-Host 'The game folder is not in its log: start the game, then run this again.'
    Write-Host 'Папки игры нет в журнале: запустите игру и выполните это снова.'
    return
  }
  # Strings, not Join-Path: a drive the log names may be gone. Brackets in a folder name are
  # escaped, or Get-Item would read them as a pattern.
  $folder = [WildcardPattern]::Escape($game.Value.TrimEnd('/')) + '/webCaches'
  $caches = @(Get-Item -Path "$folder/Cache/Cache_Data/data_2", "$folder/*/Cache/Cache_Data/data_2" `
    -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
  # Printable characters only, so a match never runs into the binary bytes around it.
  $links = @(if ($caches.Count) {
    [regex]::Matches((Read-Shared $caches[0].FullName),
      'https://[!-~]+?auth_appid=webview_gacha[!-~]+?authkey=[!-~]+?game_biz=hkrpg_\w+') |
      ForEach-Object { $_.Value }
  })
  if (-not $links.Count) {
    Write-Host 'No link found: open the warp history in the game, then run this again.'
    Write-Host 'Ссылка не найдена: откройте историю прыжков в игре и выполните это снова.'
    return
  }
  # The cache reuses its space, so the last link in it is not always the newest: a link that
  # carries the time it was made wins, the last one otherwise.
  $link = $links[-1]
  $newest = -1
  foreach ($candidate in $links) {
    if ($candidate -match 'timestamp=(\d+)' -and [long] $Matches[1] -ge $newest) {
      $newest = [long] $Matches[1]
      $link = $candidate
    }
  }
  try {
    Set-Clipboard -Value $link
    Write-Host 'The link is copied. Paste it into the HoYo Toolkit page:'
    Write-Host 'Ссылка скопирована. Вставьте её на странице HoYo Toolkit:'
  } catch {
    Write-Host 'Copy this link and paste it into the HoYo Toolkit page:'
    Write-Host 'Скопируйте эту ссылку и вставьте её на странице HoYo Toolkit:'
  }
  Write-Host $link
}
