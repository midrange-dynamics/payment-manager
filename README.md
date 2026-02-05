# Payment Tracker VS Code Extension

A VS Code extension for tracking payments with timeline visualization.

## Features

- **Payment Entry Form**: Enter payments with the following fields:
  - Date
  - Amount
  - First Payment Date
  - Occurrence (Once, Daily, Weekly, Bi-weekly, Monthly, Quarterly, Yearly)
  - Description
  - Person

- **Timeline Visualization**: View all payments with a visual timeline showing all scheduled occurrences
  - Past payments are shown with reduced opacity
  - Today's payment is highlighted
  - Future payments are displayed normally

- **Local Storage**: All payment data is stored locally using VS Code's workspace storage API

## Usage

1. Open the Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Open Payment Tracker" and select the command
3. The payment tracker webview will open in a new panel
4. Fill in the payment form and click "Add Payment"
5. View your payments in the timeline above the form
6. Delete payments by clicking the "Delete" button on any payment item

## Development

### Prerequisites

- Node.js
- npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

3. Press F5 in VS Code to open a new Extension Development Host window
4. In the new window, run the "Open Payment Tracker" command

### Building

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

## Data Storage

Payment data is stored in VS Code's workspace state, which persists across sessions. The data is stored per workspace, so each workspace has its own payment list.
