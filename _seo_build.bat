@echo off
cd /d "D:\Code\NicoPython\frontend"
echo === NPM INSTALL === > "D:\Code\NicoPython\_seo_build.log"
call npm install >> "D:\Code\NicoPython\_seo_build.log" 2>&1
echo INSTALL_EXIT_%ERRORLEVEL% >> "D:\Code\NicoPython\_seo_build.log"
echo === NPM RUN BUILD === >> "D:\Code\NicoPython\_seo_build.log"
call npm run build >> "D:\Code\NicoPython\_seo_build.log" 2>&1
echo BUILD_EXIT_%ERRORLEVEL% >> "D:\Code\NicoPython\_seo_build.log"
echo ALL_DONE >> "D:\Code\NicoPython\_seo_build.log"
