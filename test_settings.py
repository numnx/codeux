from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/")
    page.wait_for_timeout(5000)
    page.goto("http://localhost:5173/config")
    page.wait_for_timeout(5000)
    page.screenshot(path="settings.png")
    browser.close()
