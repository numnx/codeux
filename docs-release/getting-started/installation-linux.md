# Linux Installation Guide

This guide provides step-by-step instructions for installing the application on Linux systems. You can install the application either by downloading the latest release via `git` or by using your system's package manager.

## Prerequisites

Before proceeding, ensure your system meets the following requirements:

- **Git:** Required to clone the repository or fetch recent releases.
- **Curl:** Required for fetching installation scripts.
- **Node.js:** Ensure Node.js (v18 or higher) is installed.
- **Permissions:** You must have `sudo` privileges or appropriate write access to your chosen installation directory (e.g., `/usr/local/bin` or `/opt`).

---

## Option 1: Install via Git (Recommended)

This method ensures you are installing directly from the latest official release branch.

### 1. Clone the Release Repository

Clone the latest release branch to your local machine:

```bash
git clone --depth 1 --branch latest-release https://github.com/example/repo.git /opt/app-name
cd /opt/app-name
```

### 2. Set Execution Permissions

Ensure the installation scripts and binaries have the correct execution permissions:

```bash
sudo chmod +x ./install.sh
sudo chown -R $USER:$USER /opt/app-name
```

### 3. Run the Installation Script

Execute the provided installation script to configure your environment:

```bash
./install.sh
```

---

## Option 2: Install via Package Manager

You can also use your Linux distribution's package manager to install the application.

### Debian / Ubuntu (APT)

```bash
# Add the official repository key
curl -fsSL https://example.com/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/app-name-keyring.gpg

# Add the repository to your sources
echo "deb [signed-by=/usr/share/keyrings/app-name-keyring.gpg] https://example.com/apt stable main" | sudo tee /etc/apt/sources.list.d/app-name.list > /dev/null

# Update and install
sudo apt update
sudo apt install app-name
```

### Arch Linux (Pacman)

```bash
# Install via the Arch User Repository (AUR)
git clone https://aur.archlinux.org/app-name.git
cd app-name
makepkg -si
```

### Fedora / RHEL (DNF)

```bash
# Add the official repository
sudo dnf config-manager --add-repo https://example.com/rpm/app-name.repo

# Install the package
sudo dnf install app-name
```

---

## Post-Installation Verification

To verify that the installation was successful, check the application version:

```bash
app-name --version
```

If the command returns the expected version number, the installation is complete.

## Troubleshooting

- **Permission Denied:** Ensure you are running commands with `sudo` where indicated, or verify you have write access to `/opt` and `/usr/local/bin`.
- **Command Not Found:** Verify that the installation directory has been added to your system's `$PATH` variable.
