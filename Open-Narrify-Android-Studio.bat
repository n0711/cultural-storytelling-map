@echo off
setlocal

if defined NARRIFY_STUDIO_EXE (
    if exist "%NARRIFY_STUDIO_EXE%" goto launch
    echo NARRIFY_STUDIO_EXE does not point to an existing file.
    goto not_found
)

set "NARRIFY_STUDIO_EXE=%ProgramFiles%\Android\Android Studio\bin\studio64.exe"
if exist "%NARRIFY_STUDIO_EXE%" goto launch

set "NARRIFY_STUDIO_EXE=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
if exist "%NARRIFY_STUDIO_EXE%" goto launch

for /f "delims=" %%S in ('where studio64.exe 2^>nul') do (
    set "NARRIFY_STUDIO_EXE=%%S"
    goto launch
)

:not_found
echo Android Studio was not found.
echo Install it, or set NARRIFY_STUDIO_EXE to the path of studio64.exe.
echo Then run this launcher again.
echo Project folder: "%~dp0mobile\android"
pause
exit /b 1

:launch
start "" "%NARRIFY_STUDIO_EXE%" "%~dp0mobile\android"
exit /b %errorlevel%
