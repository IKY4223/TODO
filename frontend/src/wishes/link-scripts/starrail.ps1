# HoYo Toolkit: finds the Honkai: Star Rail warp history link on this PC. / Находит ссылку на историю прыжков Honkai: Star Rail.
# It reads two of the game's own files and prints the link. It sends nothing over the network and
# writes no file; it copies the link to the clipboard. Where the files are and how the link is
# found: biuuu/star-rail-warp-export (MIT licence), src/main/getData.js.
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
  $game = [regex]::Match((Read-Shared $log), '\w:/.*?/StarRail_Data/')
  if (-not $game.Success) {
    Write-Host 'The game folder is not in its log: start the game, then run this again.'
    Write-Host 'Папки игры нет в журнале: запустите игру и выполните это снова.'
    return
  }
  $caches = @(Get-Item -Path (Join-Path $game.Value 'webCaches\Cache\Cache_Data\data_2'),
    (Join-Path $game.Value 'webCaches\*\Cache\Cache_Data\data_2') -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending)
  $links = @(if ($caches.Count) {
    [regex]::Matches((Read-Shared $caches[0].FullName), 'https[^?]+?\?[^?]+?&auth_appid=webview_gacha&.+?authkey=.+?&game_biz=hkrpg_\w+')
  })
  if (-not $links.Count) {
    Write-Host 'No link found: open the warp history in the game, then run this again.'
    Write-Host 'Ссылка не найдена: откройте историю прыжков в игре и выполните это снова.'
    return
  }
  $link = $links[$links.Count - 1].Value # the newest one
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
