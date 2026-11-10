#!/usr/bin/env python3
"""Chromium mobile-emulation smoke test for BarberGame Weekly hours.

This is a browser test of the actual locally served prototype.
It does not replace physical-device Safari/VoiceOver verification.

Setup (from the ai-website-test repository root):
    python3 -m http.server 8128
    # in another terminal:
    python3 -m pip install playwright
    python3 -m playwright install chromium
    python3 barber-game/barber-admin-dashboard/handoff/mobile-weekly-hours-smoke.py

Optional:
    python3 barber-game/barber-admin-dashboard/handoff/mobile-weekly-hours-smoke.py \
      --url http://127.0.0.1:8128/barber-game/barber-admin-dashboard/ \
      --screenshots /tmp/barbergame-weekly-qa

Test uses a fresh isolated browser context and seeds demo localStorage only once.
Never point this test at a real production customer account.
"""
import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright, expect


def run(url: str, screenshots: str | None):
    output = Path(screenshots) if screenshots else None
    if output:
        output.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 393, "height": 852},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
        )
        context.add_init_script(
            """(() => {
                sessionStorage.setItem('tbg-auth', '1');
                if (!sessionStorage.getItem('weekly-qa-seeded')) {
                    localStorage.setItem('tbg-demo-weekly-hours-v2',
                        JSON.stringify([
                            {periods: []},
                            ...Array.from({length: 5}, () => ({periods: [{start:540,end:1080}]})),
                            {periods: []}
                        ]));
                    sessionStorage.setItem('weekly-qa-seeded', '1');
                }
            })();"""
        )
        page = context.new_page()
        page.set_default_timeout(7000)
        try:
            page.goto(url, wait_until="domcontentloaded", timeout=15000)
            # First-time users must acknowledge example messages before the demo unlocks.
            for _ in range(5):
                if not page.locator("#ackGate").evaluate("(el) => el.classList.contains('active')"):
                    break
                page.locator("#ackCheck").check()
                page.locator("#ackContinue").click()
            assert not page.locator("#ackGate").evaluate(
                "(el) => el.classList.contains('active')"
            ), "Acknowledgment overlay could not be dismissed"
            monday = page.locator("#days .weekday").first
            expect(monday).to_contain_text("Monday")
            expect(monday).to_contain_text("Closed")
            monday.get_by_role("button", name="Edit").click()
            expect(page.locator("#sheetTitle")).to_have_text("Monday hours")
            expect(page.locator("#dayClosedState")).to_be_visible()
            expect(page.locator("#dayScheduleEditor")).to_be_hidden()
            if output:
                page.screenshot(path=str(output / "01-closed.png"))

            page.locator("#dayOpenButton").click()
            expect(page.locator("#dayScheduleEditor")).to_be_visible()
            expect(page.locator("#dayStartDisplay")).to_have_text("2:00 PM")
            expect(page.locator("#dayEndDisplay")).to_have_text("4:00 PM")
            expect(page.locator("#dayPeriodsWrap")).to_be_hidden()
            if output:
                page.screenshot(path=str(output / "02-open-suggestion.png"))

            page.get_by_role("button", name="Add time").click()
            expect(page.locator("#dayPeriods")).to_contain_text("2:00 PM – 4:00 PM")
            expect(page.locator("#dayStartDisplay")).to_have_text("6:00 PM")
            expect(page.locator("#dayEndDisplay")).to_have_text("8:00 PM")
            page.get_by_role("button", name="Add time").click()
            expect(page.locator("#dayPeriods")).to_contain_text("6:00 PM – 8:00 PM")
            expect(page.locator("#dayPeriods button")).to_have_count(2)
            if output:
                page.screenshot(path=str(output / "03-two-ranges.png"))

            page.locator("#dayPeriods button").first.click()
            expect(page.locator("#dayPeriods button")).to_have_count(1)
            expect(page.locator("#dayPeriods")).not_to_contain_text("2:00 PM – 4:00 PM")
            expect(page.locator("#dayPeriods")).to_contain_text("6:00 PM – 8:00 PM")
            expect(page.locator("#dayScheduleEditor")).to_be_visible()

            page.locator("#dayStartButton").click()
            expect(page.locator("#dayTimePicker")).to_be_visible()
            hours = page.get_by_role("radiogroup", name="Hour")
            chosen = hours.locator('[aria-checked="true"]')
            old_value = chosen.get_attribute("data-day-time-value")
            chosen.focus()
            page.keyboard.press("ArrowDown")
            new_chosen = hours.locator('[aria-checked="true"]')
            assert new_chosen.get_attribute("data-day-time-value") != old_value
            assert new_chosen.evaluate("(el) => document.activeElement === el"), "Picker focus was lost"
            page.keyboard.press("Escape")
            expect(page.locator("#dayTimePicker")).to_be_hidden()
            assert page.locator("#dayStartButton").evaluate(
                "(el) => document.activeElement === el"
            ), "Closing picker did not restore focus"

            page.locator("#saveBtn").click()
            expect(page.locator("#veil")).not_to_have_class("open")
            expect(monday).to_contain_text("6:00 PM")
            expect(monday).to_contain_text("8:00 PM")

            page.reload(wait_until="domcontentloaded")
            monday = page.locator("#days .weekday").first
            expect(monday).to_contain_text("6:00 PM")
            expect(monday).to_contain_text("8:00 PM")
            monday.get_by_role("button", name="Edit").click()
            expect(page.locator("#dayPeriods")).to_contain_text("6:00 PM – 8:00 PM")
            if output:
                page.screenshot(path=str(output / "04-reopened.png"))
            print("PASS: closed/open, suggested vs saved, two ranges, delete,")
            print("      focus-preserving picker, Escape, list overview, reload.")
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8128/barber-game/barber-admin-dashboard/",
    )
    parser.add_argument("--screenshots", default=None)
    args = parser.parse_args()
    run(args.url, args.screenshots)
