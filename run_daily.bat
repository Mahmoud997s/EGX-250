@echo off
cd /d "C:\Users\DELL\Desktop\Baba\egx-scraper-poc"
echo [%date% %time%] Starting EGX Daily Pipeline... >> logs\cron.log
node run_pipeline.js >> logs\cron.log 2>&1
echo [%date% %time%] Finished EGX Daily Pipeline. >> logs\cron.log
