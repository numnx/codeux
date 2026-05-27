# Build and Run from Source

This guide provides instructions on how to compile the Jules Subagents application and run it locally from the source code.

## Prerequisites

Before beginning, ensure your development environment meets the following requirements:

- **Node.js**: Version 18.x or later.
- **pnpm**: Version 8.x or later (the primary package manager for this project).
- **Git**: Installed and accessible from your command line.

## Installation and Build Steps

### Step 1: Clone the repository

Clone the source code from the official GitHub repository and navigate into the project directory.

```bash
git clone https://github.com/numnx/jules-subagents-mcp.git
cd jules-subagents-mcp
```

### Step 2: Install dependencies

Install all required dependencies using `pnpm`.

```bash
pnpm install
```

### Step 3: Build the application

Compile the backend services and build the web dashboard. This step ensures that both the Model Context Protocol (MCP) server and the dashboard artifacts are correctly generated.

```bash
pnpm run build
```

### Step 4: Run the Web Dashboard Locally

Start the local development server, which runs the MCP server and serves the dashboard simultaneously.

```bash
pnpm run dev
```

Once the server has started, you can access the web dashboard locally by opening the following URL in your web browser:

```
http://localhost:4444
```