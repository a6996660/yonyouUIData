@echo off
cd /d "%~dp0"

echo Checking if project folder exists...
if exist yonyouUIData (
    echo Project folder already exists, cleaning...
    rmdir /s /q yonyouUIData
)

echo Cloning project, please wait...
git clone https://a6996660:bd78bdf0588dce68391bbf0eb3f85dfa@gitee.com/a6996660/yonyouUIData.git

echo Handling potential filename issues...
cd yonyouUIData

:: Fix the known issue with trailing space in db-config.json filename
if exist "config" (
    cd config
    dir /b > filelist.txt
    findstr /C:"db-config.json" filelist.txt > nul
    if %errorlevel% equ 0 (
        echo Fixing invalid filename issue...
        ren "db-config.json" db-config.json
    )
    del filelist.txt
    cd ..
)

echo Checking if port 9527 is in use...
netstat -ano | findstr ":9527" > nul
if %errorlevel% equ 0 (
    echo Port 9527 is already in use, cleaning processes...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9527"') do (
        taskkill /F /PID %%a
        echo Terminated process PID: %%a
    )
)

echo Starting backend service...
if exist dbtreeview-1.0.0.jar (
    start /b java -jar dbtreeview-1.0.0.jar
    if errorlevel 1 (
        echo Failed to start Java service. Please check if Java is installed and compatible.
        pause
        exit /b 1
    )
) else (
    echo JAR file not found. Clone may have been incomplete.
    pause
    exit /b 1
)

echo Waiting for backend service to start...
timeout /t 5

echo Opening webpage...
if exist "webdata\v1.0\nginx\html\database-relation.html" (
    start "" "webdata\v1.0\nginx\html\database-relation.html"
) else (
    echo Webpage file not found. Please check if the path is correct.
    pause
)

echo Operation completed!
echo.
echo Backend service is running in the background. Do not close this window or the service will terminate.
echo Press any key to close this window and terminate the service...
pause 