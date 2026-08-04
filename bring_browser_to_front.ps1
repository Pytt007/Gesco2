Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@

$proc = Get-Process -Name "chrome", "chrome_dev", "firefox" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1

if ($proc) {
    $hwnd = $proc.MainWindowHandle
    if ([Win32]::IsIconic($hwnd)) {
        [Win32]::ShowWindowAsync($hwnd, 9) # SW_RESTORE
    }
    [Win32]::SetForegroundWindow($hwnd)
    Write-Host "✅ Fenêtre ramenée au premier plan !"
} else {
    Write-Host "Lancement de Chrome Dev..."
    Start-Process "C:\Program Files\Google\Chrome Dev\Application\chrome.exe" "http://localhost:3000"
}
