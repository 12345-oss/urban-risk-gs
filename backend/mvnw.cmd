@echo off
rem Maven Wrapper simplificado (Windows).
rem Baixa o Maven 3.9.11 na primeira execucao (em %USERPROFILE%\.m2\wrapper) e repassa os argumentos.
rem Uso: mvnw spring-boot:run   ou   mvnw test
setlocal
set "BASEDIR=%~dp0"
for /f "usebackq tokens=1,* delims==" %%A in ("%BASEDIR%.mvn\wrapper\maven-wrapper.properties") do (
  if "%%A"=="distributionUrl" set "URL=%%B"
  if "%%A"=="distributionName" set "NAME=%%B"
)
if "%MAVEN_USER_HOME%"=="" set "MAVEN_USER_HOME=%USERPROFILE%\.m2"
set "DEST=%MAVEN_USER_HOME%\wrapper\dists\%NAME%"
set "MVN_CMD=%DEST%\%NAME%\bin\mvn.cmd"
if exist "%MVN_CMD%" goto executar
echo Baixando %NAME% - somente na primeira execucao...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; [Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; New-Item -ItemType Directory -Force -Path $env:DEST | Out-Null; $zip=Join-Path $env:DEST 'maven.zip'; Invoke-WebRequest -UseBasicParsing -Uri $env:URL -OutFile $zip; Expand-Archive -Force -Path $zip -DestinationPath $env:DEST; Remove-Item $zip"
if errorlevel 1 goto falha
:executar
"%MVN_CMD%" -f "%BASEDIR%pom.xml" %*
endlocal & exit /b %ERRORLEVEL%
:falha
echo Nao foi possivel baixar o Maven. Verifique a internet ou instale o Maven e rode: mvn spring-boot:run
endlocal & exit /b 1
