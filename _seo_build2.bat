@echo off
cd /d "D:\Code\NicoPython\frontend"
echo START_INSTALL > "D:\Code\NicoPython\_seo_build.log"
call npm install --no-audit --no-fund < NUL >> "D:\Code\NicoPython\_seo_build.log" 2>&1
echo INSTALL_EXIT_%ERRORLEVEL% >> "D:\Code\NicoPython\_seo_build.log"
echo START_BUILD >> "D:\Code\NicoPython\_seo_build.log"
call npm run build < NUL >> "D:\Code\NicoPython\_seo_build.log" 2>&1
echo BUILD_EXIT_%ERRORLEVEL% >> "D:\Code\NicoPython\_seo_build.log"
echo ALL_DONE >> "D:\Code\NicoPython\_seo_build.log"
