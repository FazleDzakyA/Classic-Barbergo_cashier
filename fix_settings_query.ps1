Get-ChildItem -Recurse -Path 'C:\Users\ASUS\.gemini\antigravity\scratch\barberflow\src' -Include '*.tsx','*.ts' | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $oldPattern = "db\.settings\.where\('key'\)\.equals\('app_settings'\)\.first\(\)"
    $newValue = "db.settings.get()"
    if ($content -match $oldPattern) {
        $new = $content -replace $oldPattern, $newValue
        Set-Content $_.FullName $new -NoNewline
        Write-Host "Fixed: $($_.Name)"
    }
}
