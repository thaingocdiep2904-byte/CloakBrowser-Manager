import asyncio
import os
import shutil
from pathlib import Path
from cloakbrowser import launch_persistent_context_async

async def main():
    profile_dir = Path("D:/APP/CloakBrowser/CloakBrowser-Manager/scratch/profile_humanize_cloak")
    if profile_dir.exists():
        shutil.qmtree(profile_dir, ignore_errors=True)
    profile_dir.mkdir(parents=True, exist_ok=True)
    
    print("Launching CloakBrowser with HUMANIZE=TRUE...")
    
    extra_args = [
        "--disable-infobars",
        "--test-type",
        "--use-angle=swiftshade",
        "--fingerprint=12345",
        "--fingerprint-platform=windows",
        "--fingerprint-gpu-vendor=Google Inc. (NVIDIA)",
        "--fingerprint-gpu-renderer=ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002484) Direct3D11 vs_5_0 ps_5_0, D3D11)",
        "--fingerprint-hardware-concurrency=8",
        "--fingerprint-screen-width=1920",
        "--fingerprint-screen-height=1080",
    ]
    
    context = await launch_persistent_context_async(
        user_data_dir=os.fspath(profile_dir),
        headless=False,
        args=extra_args,
        humanize=True,
        human_preset="default",
        viewport=None
    )
    
    page = await context.new_page()
    print("Navigating to Google Search...")
    await page.goto("https://www.google.com")
    
    print("Keep browser open for 60 seconds to inspect...")
    await asyncio.sleep(60)
    await context.close()

if __name__ == "__main__":
    asyncio.run(main())