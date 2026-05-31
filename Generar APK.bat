@echo off
setlocal
cd /d "%~dp0"
echo ============================================
echo   Generando APK de BassTheory...
echo ============================================
echo.

set "ANDROID_HOME=C:\Users\agust\AppData\Local\Android\Sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

echo [1/4] Compilando la app web...
call npm run build
if errorlevel 1 goto error

echo.
echo [2/4] Sincronizando con Android...
call npx cap sync android
if errorlevel 1 goto error

echo.
echo [3/4] Generando el APK (esto puede tardar un minuto)...
call "%~dp0android\gradlew.bat" -p "%~dp0android" assembleDebug
if errorlevel 1 goto error

echo.
echo [4/4] Copiando APK al Escritorio...
copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\OneDrive\Escritorio\BassTheory.apk" >nul 2>&1
if errorlevel 1 copy /Y "%~dp0android\app\build\outputs\apk\debug\app-debug.apk" "%USERPROFILE%\Desktop\BassTheory.apk" >nul 2>&1

echo.
echo ============================================
echo   LISTO! APK actualizado en el Escritorio:
echo   BassTheory.apk
echo ============================================
echo.
pause
exit /b 0

:error
echo.
echo ============================================
echo   ERROR: algo fallo. Revisa los mensajes de arriba.
echo ============================================
echo.
pause
exit /b 1
