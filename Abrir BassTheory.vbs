Option Explicit

Dim WshShell, fso, folder
Set WshShell = CreateObject("WScript.Shell")
Set fso     = CreateObject("Scripting.FileSystemObject")
folder      = fso.GetParentFolderName(WScript.ScriptFullName)

' ── Chequea si el servidor ya esta corriendo ─────────────────────────────────
Function ServerReady()
    ServerReady = False
    On Error Resume Next
    Dim http
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open "GET", "http://127.0.0.1:5173", False
    http.SetTimeouts 600, 600, 600, 600
    http.Send
    If Err.Number = 0 Then ServerReady = True
    On Error GoTo 0
End Function

' Si ya esta corriendo solo abrimos el browser y salimos
If ServerReady() Then
    WshShell.Run "http://127.0.0.1:5173"
    WScript.Quit
End If

' ── Arranca el servidor completamente oculto (WindowStyle 0) ─────────────────
' El proceso queda vivo en segundo plano hasta que el heartbeat lo apague.
WshShell.Run "cmd /c cd /d """ & folder & """ && npm run dev", 0, False

' ── Espera hasta que el servidor este listo (max 40 s) ───────────────────────
Dim i
For i = 1 To 40
    WScript.Sleep 1000
    If ServerReady() Then Exit For
Next

' ── Abre el navegador ────────────────────────────────────────────────────────
WshShell.Run "http://127.0.0.1:5173"
