#include "WinHttp.au3"
#include <MsgBoxConstants.au3>

;Global $sGet = HttpGet("http://www.google.com/")
;FileWrite("Google.txt", $sGet)

; Set title match mode to partial matching and get hWnd of bot window
Opt("WinTitleMatchMode", 2)
Local $botHwnd = WinWait("Dragneel")
Local $botLogHwnd = ControlGetHandle($botHwnd, "", "[ID:1133]")
Local $sLogText = ControlGetText($botHwnd, "", $botLogHwnd)
MSGBOX($MB_OK, "Woot!", $sLogText)
