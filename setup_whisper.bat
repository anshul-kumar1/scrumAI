@echo off
echo Setting up Whisper AI transcription for ScrumAI...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

echo Python found!

REM Create virtual environment for Whisper
echo Creating Python virtual environment...
python -m venv whisper_env

REM Activate virtual environment
echo Activating virtual environment...
call whisper_env\Scripts\activate.bat

REM Install minimal requirements
echo Installing Python dependencies...
pip install -r whisper\requirements_minimal.txt

echo.
echo Whisper setup complete!
echo.
echo To test the integration:
echo 1. Run 'npm start' to start the ScrumAI application
echo 2. Click 'Start Meeting' to begin transcription
echo 3. Speak into your microphone and watch the transcript appear
echo.
pause