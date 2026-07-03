import asyncio
import os
import shutil
from pathlib import Path
from cloakbrowser import launch_persistent_context_async

async def main():
    profile_dir = Path("D:/APP/CloakBrowser/CloakBrowser-Manager/scratch/profile_clean_cloak")
    if profile_dir.exists():
        shutil.qmtree(profile_dir, ignore_errors=True)
    profile_dir.mkdir(parents=True, exist_ok=True)
    
    print("Launching CLEAN CloakBrowser with automatic settings...")
    context = await launch_persistent_context_async(
        user_data_dir=os.fspath(profile_dir),
        headless=False,
        viewport=None
    )
    
    page = await context.new_page()
    print("Navigating to Bot Detector...")
    await page.goto("https://bot-detector.rebrowser.net/")
    await asyncio.sleep(2)
    print("Navigating to Google Search...")
    await page.goto("https://www.google.com")
    
    print("Keep browser open for 60 seconds to inspect...")
    await asyncio.sleep(60)
    await context.close()

if __name__ == "__main__":
    asyncio.run(main())