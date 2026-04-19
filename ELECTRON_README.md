# Inventory React App - Electron Desktop Application

A modern inventory management application built with React and Electron.

## Features

- **Desktop Application**: Cross-platform desktop app using Electron
- **Modern UI**: Built with React and modern CSS
- **Inventory Management**: Add, edit, and manage inventory items
- **Issue Notes**: Create and manage issue notes for inventory items
- **Export Functionality**: Export inventory data to various formats
- **Secure Architecture**: Uses Electron's security best practices

## Project Structure

```
inventory_react_app/
├── src/
│   ├── electron/
│   │   ├── main.js          # Main Electron process
│   │   ├── preload.js       # Preload script for secure IPC
│   │   └── package.json     # Electron-specific package.json
│   ├── App.jsx              # Main React component
│   ├── main.jsx             # React entry point
│   └── ...
├── components/              # React components
├── package.json            # Main package.json
└── vite.config.js          # Vite configuration
```

## Scripts

### Development
- `npm run dev` - Start Vite development server
- `npm run electron` - Start Electron with built files
- `npm run electron-dev` - Start both Vite dev server and Electron in development mode

### Building
- `npm run build` - Build the React app for production
- `npm run build-electron` - Build and package the Electron app
- `npm run dist` - Create distributable packages

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install additional Electron development dependencies (if not already installed):
```bash
npm install --save-dev concurrently wait-on electron-builder
```

### Development

1. Start the development environment:
```bash
npm run electron-dev
```

This will:
- Start the Vite development server on `http://localhost:5173`
- Wait for the server to be ready
- Launch the Electron application
- Enable hot reload for React components
- Open DevTools for debugging

### Building for Production

1. Build the React application:
```bash
npm run build
```

2. Test the built application with Electron:
```bash
npm run electron
```

3. Create distributable packages:
```bash
npm run dist
```

This will create platform-specific installers in the `dist-electron` directory.

## Application Features

### Main Window
- Responsive design that adapts to window size
- Minimum window size: 800x600
- Default size: 1200x800

### Menu System
- **File Menu**: New item creation, export functionality, quit
- **Edit Menu**: Standard editing operations (undo, redo, cut, copy, paste)
- **View Menu**: Zoom controls, dev tools, reload options
- **Inventory Menu**: Add items, create issue notes, refresh data
- **Window Menu**: Minimize, close operations
- **Help Menu**: About dialog

### Security Features
- Context isolation enabled
- Node integration disabled
- Secure IPC communication via preload script
- External link protection
- Single instance enforcement

### IPC Communication
The application uses Electron's IPC (Inter-Process Communication) for secure communication between the main and renderer processes:

- `electronAPI.getVersion()` - Get application version
- `electronAPI.showMessageBox(options)` - Show message dialogs
- `electronAPI.showSaveDialog(options)` - Show save file dialogs
- `electronAPI.showOpenDialog(options)` - Show open file dialogs
- Menu event handlers for inventory operations

## Development Notes

### File Structure
- **main.js**: Main Electron process, handles window creation and management
- **preload.js**: Secure bridge between main and renderer processes
- **package.json** (in src/electron/): Ensures CommonJS for Electron files

### Environment Variables
- `NODE_ENV=development` - Enables development mode features like DevTools

### Keyboard Shortcuts
- `Ctrl/Cmd + N` - New item
- `Ctrl/Cmd + E` - Export data
- `Ctrl/Cmd + I` - Add inventory item
- `Ctrl/Cmd + Shift + I` - Create issue note
- `F5` - Refresh data
- `Ctrl/Cmd + Q` - Quit application

## Building for Different Platforms

### Windows
```bash
npm run dist -- --win
```

### macOS
```bash
npm run dist -- --mac
```

### Linux
```bash
npm run dist -- --linux
```

## Troubleshooting

### Common Issues

1. **Port 5173 already in use**
   - Kill any processes using port 5173
   - The Vite config enforces strict port usage

2. **Electron not launching in development**
   - Ensure the Vite dev server is running first
   - Check that `wait-on` dependency is installed

3. **Build fails**
   - Run `npm run build` first to ensure React app builds correctly
   - Check that all dependencies are installed

4. **Icon not showing**
   - Ensure `src/logo.png` exists
   - Check that the path in electron-builder config is correct

## Contributing

1. Make sure to test both development and production builds
2. Follow the existing code style and structure
3. Update this README if adding new features or changing the build process

## License

This project is private and proprietary.