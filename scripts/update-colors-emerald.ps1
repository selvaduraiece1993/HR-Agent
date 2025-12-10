$colorMappings = @{
    'rose-50' = 'emerald-50'
    'rose-100' = 'emerald-100'
    'rose-200' = 'emerald-200'
    'rose-300' = 'emerald-300'
    'rose-400' = 'emerald-400'
    'rose-500' = 'emerald-500'
    'rose-600' = 'emerald-600'
    'rose-700' = 'emerald-700'
    'rose-800' = 'emerald-800'
    'rose-900' = 'emerald-900'
    'cyan-50' = 'amber-50'
    'cyan-100' = 'amber-100'
    'cyan-200' = 'amber-200'
    'cyan-300' = 'amber-300'
    'cyan-400' = 'amber-400'
    'cyan-500' = 'amber-500'
    'cyan-600' = 'amber-600'
    'cyan-700' = 'amber-700'
    'cyan-800' = 'amber-800'
    'cyan-900' = 'amber-900'
    'red-50' = 'emerald-50'
    'red-100' = 'emerald-100'
    'red-200' = 'emerald-200'
    'red-300' = 'emerald-300'
    'red-400' = 'emerald-400'
    'red-500' = 'orange-500'
    'red-600' = 'orange-600'
    'red-700' = 'orange-700'
}

$files = Get-ChildItem -Path "app","components","context" -Recurse -Include *.js,*.jsx -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName
    $modified = $false
    
    foreach ($oldColor in $colorMappings.Keys) {
        $newColor = $colorMappings[$oldColor]
        if ($content -match $oldColor) {
            $content = $content -replace "\b$oldColor\b", $newColor
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content
        Write-Host "Updated: $($file.FullName)"
    }
}
Write-Host "Color replacement complete!"
