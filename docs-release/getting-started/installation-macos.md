# macOS Installation Guide

This guide provides step-by-step instructions for installing the application on macOS. You can choose to install via Homebrew (recommended) or by manually downloading and installing the DMG file.

## Prerequisites

- macOS 12.0 (Monterey) or later
- Administrative privileges on your Mac
- (Optional) Homebrew installed, if choosing the Homebrew method

---

## Method 1: Install via Homebrew (Recommended)

Homebrew is the easiest way to install and manage macOS applications.

1. **Add the Tap:**
   Open Terminal and run the following command to add our custom tap:
   ```bash
   brew tap jules/jules-software
   ```

2. **Install the Application:**
   Run the install command:
   ```bash
   brew install --cask jules-app
   ```

3. **Launch the Application:**
   Open Launchpad or Spotlight Search (`Cmd + Space`) and type `Jules` to open the application.

---

## Method 2: Install via DMG

If you prefer not to use Homebrew, you can manually download and install the DMG package.

1. **Download the DMG File:**
   Navigate to the [Releases page](https://example.com/releases) and download the latest `.dmg` file for macOS.

2. **Mount the DMG:**
   Locate the downloaded `.dmg` file in your `Downloads` folder and double-click it to mount the disk image.

3. **Install the App:**
   In the window that opens, drag and drop the `Jules.app` icon into the `Applications` folder icon.

4. **Eject the Disk Image:**
   Once the copy is complete, right-click the mounted DMG on your desktop or in Finder and select **Eject**.

---

## Security Override (macOS Gatekeeper)

Because the application might be newly released, macOS Gatekeeper may temporarily block it from running the first time. If you encounter a message saying "Jules cannot be opened because the developer cannot be verified," follow these steps:

1. **Attempt to Open:**
   Open your `Applications` folder, right-click (or `Control-click`) on the `Jules` app, and select **Open**.

2. **Confirm the Exception:**
   A prompt will appear warning you about an unverified developer. Click **Open** anyway.

3. **Alternative Method via Settings:**
   - If the app does not open, go to **System Settings** > **Privacy & Security**.
   - Scroll down to the **Security** section.
   - You should see a message indicating that `Jules` was blocked. Click **Open Anyway**.
   - Enter your Mac password or use Touch ID to confirm, then click **Open** on the final prompt.

After completing this security override once, the application will open normally in the future.
