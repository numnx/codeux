# Windows Installation Guide

## Overview

This guide details the step-by-step process for installing Jules Agent OS on Windows environments. The installation procedure requires administrative privileges and is supported on Windows 10 and later (64-bit architectures).

## Prerequisites

Before beginning the installation, ensure the following requirements are met:
- **Operating System:** Windows 10 (64-bit) or later.
- **Permissions:** Administrative access is required to execute the installer and configure local security policies.

## Installation Procedure

Follow these instructions to install the application using the official MSI or EXE distribution packages.

### 1. Download the Installer
- Navigate to the official releases repository.
- Download the appropriate installer package:
  - Executable format (`Jules-Setup-x.x.x.exe`)
  - Windows Installer format (`Jules-Setup-x.x.x.msi`)

### 2. Execute the Setup Wizard
- Locate the downloaded package and double-click to execute.
- **Note:** Administrative privileges may be requested via User Account Control (UAC). Accept the prompt to proceed.
- Follow the interactive setup wizard. The default installation directory is `C:\Program Files\Jules Agent OS`.

### 3. Handling Windows Defender SmartScreen
During execution, Windows Defender SmartScreen may flag the installer due to pending reputation metrics.

To bypass the warning and proceed:
1. When the "Windows protected your PC" dialog appears, select **More info**.
2. Click the **Run anyway** button that becomes visible at the bottom of the dialog.

### 4. Finalization
Upon completion of the setup wizard, the installation is finalized. Launch Jules Agent OS via the Start Menu shortcut or the newly created desktop icon.

## Post-Installation Verification

To confirm the integrity of the installation:
1. Execute Jules Agent OS from the Start Menu.
2. Verify that the application dashboard initializes without generating error alerts.
