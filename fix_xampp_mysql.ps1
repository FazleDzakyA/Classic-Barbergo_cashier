$data = 'C:\xampp\mysql\data'
$backup = 'C:\xampp\mysql\backup'
$timestamp = Get-Date -Format 'yyyyMMddHHmmss'
$oldDirName = "data_corrupt_$timestamp"
$oldPath = "C:\xampp\mysql\$oldDirName"

if (Test-Path $data) {
    Write-Host "Renaming corrupted data directory to $oldDirName..."
    Rename-Item -Path $data -NewName $oldDirName
}

Write-Host "Restoring fresh data folder from backup..."
Copy-Item -Path $backup -Destination $data -Recurse -Force

if (Test-Path $oldPath) {
    Write-Host "Copying user databases to new data folder..."
    Get-ChildItem -Path $oldPath -Directory | ForEach-Object {
        if ($_.Name -ne 'mysql' -and $_.Name -ne 'performance_schema' -and $_.Name -ne 'test') {
            $target = Join-Path $data $_.Name
            Write-Host "Restoring database: $($_.Name)"
            Copy-Item -Path $_.FullName -Destination $target -Recurse -Force
        }
    }

    $ibdata = Join-Path $oldPath 'ibdata1'
    if (Test-Path $ibdata) {
        Write-Host "Restoring ibdata1..."
        Copy-Item -Path $ibdata -Destination (Join-Path $data 'ibdata1') -Force
    }
}

Write-Host "XAMPP MySQL repair script completed successfully!"
