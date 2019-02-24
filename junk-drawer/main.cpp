#include <windows.h>
#include <iostream>
#include <string>

using namespace std;

BOOL CALLBACK printSbotWindows(HWND hwnd, LPARAM lParam);

int main()
{
  // HWND hwndSbot = FindWindow("wxWindowClassNR", "[Dragneel] SBotP v1.0.52 (C)2008-2016 by bot-cave.net");
  HWND hwndSbot = (HWND)0x000A0DDA;
  LPTSTR title;
  // GetWindowText(hwndSbot, title, 255);
  // MessageBox( 0, title, "My Windows app!", MB_SETFOREGROUND );
  EnumWindows(printSbotWindows, NULL);

  return 0;
}

bool isSbotWindow(string const &windowTitle) {
  if(windowTitle.find("SBot") == string::npos) {
    return FALSE;
  }
  return TRUE;
}

BOOL CALLBACK printSbotWindows(HWND hwnd, LPARAM lParam) {
  char className[80];
  char title[80];

  GetClassName(hwnd, className, sizeof(className));
  GetWindowText(hwnd, title, sizeof(title));

  if(isSbotWindow(title)) {
    cout <<"Title: "<<title;
    cout <<"Class Name: "<<className<<endl;


  }

  return TRUE;
}
