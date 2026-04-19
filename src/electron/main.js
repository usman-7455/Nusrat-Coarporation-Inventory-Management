const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const path = require('path')
const Database = require('sqlite3').verbose()
const isDev = process.env.NODE_ENV === 'development'

// Initialize database
let db = null;

function initializeDatabase() {
  try {
    // Get the path to the database file in userData directory
    const dbPath = path.join(app.getPath('userData'), 'inventory.db');
      
    console.log('Database path:', dbPath);

    // Initialize the database
    db = new Database.Database(dbPath, (err) => {
      if (err) {
        console.error('Failed to initialize database:', err);
        return;
      }
      console.log('Database initialized successfully');
      
      // Create warehouses table
      db.run(`
        CREATE TABLE IF NOT EXISTS warehouses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating warehouses table:', err);
        } else {
          console.log('Warehouses table created or already exists');
          
          // Insert default warehouses if none exist
          db.get('SELECT COUNT(*) as count FROM warehouses', (err, row) => {
            if (!err && row.count === 0) {
              const stmt = db.prepare(`
                INSERT OR IGNORE INTO warehouses (name) VALUES (?)
              `);
              
              stmt.run('Nazim Abad');
              stmt.run('Tori Mandi');
              stmt.run('Madni Kanda Samundri Road');
              stmt.run('Sitara Market');
              stmt.finalize();
              
              console.log('Default warehouses inserted');
            }
          });
        }
      });

      // Create inventory table
      db.run(`
        CREATE TABLE IF NOT EXISTS inventory (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          warehouse_id INTEGER,
          product_name TEXT NOT NULL,
          quantity INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating inventory table:', err);
        } else {
          console.log('Inventory table created or already exists');
        }
      });

      // Create inward_pass table
      db.run(`
        CREATE TABLE IF NOT EXISTS inward_pass (
          inward_id INTEGER PRIMARY KEY AUTOINCREMENT,
          grn_no INTEGER NOT NULL UNIQUE,
          bill_no VARCHAR,
          date_received DATE NOT NULL,
          godown VARCHAR,
          supplier_name VARCHAR,
          contact_person VARCHAR,
          contact_phone VARCHAR,
          approved_by VARCHAR,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating inward_pass table:', err);
        } else {
          console.log('Inward_pass table created or already exists');
        }
      });

      // Create inward_pass_item table
      db.run(`
        CREATE TABLE IF NOT EXISTS inward_pass_item (
          item_id INTEGER PRIMARY KEY AUTOINCREMENT,
          inward_id INTEGER NOT NULL,
          sr_no INTEGER,
          item_name VARCHAR,
          uom VARCHAR,
          quantity NUMERIC,
          FOREIGN KEY (inward_id) REFERENCES inward_pass (inward_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating inward_pass_item table:', err);
        } else {
          console.log('Inward_pass_item table created or already exists');
        }
      });

      // Add indexes for inward pass tables
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_pass_date ON inward_pass(date_received)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_pass_item_name ON inward_pass_item(item_name)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_pass_godown ON inward_pass(godown)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_pass_supplier ON inward_pass(supplier_name)`);
      

      // Create outward_pass table
      db.run(`
        CREATE TABLE IF NOT EXISTS outward_pass (
          outward_id INTEGER PRIMARY KEY AUTOINCREMENT,
          gin_no INTEGER NOT NULL UNIQUE,
          bill_no VARCHAR,
          date_issued DATE NOT NULL,
          godown VARCHAR,
          part_name VARCHAR,
          contact_person VARCHAR,
          contact_phone VARCHAR,
          approved_by VARCHAR,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating outward_pass table:', err);
        } else {
          console.log('Outward_pass table created or already exists');
        }
      });

      // Create outward_pass_item table
      db.run(`
        CREATE TABLE IF NOT EXISTS outward_pass_item (
          item_id INTEGER PRIMARY KEY AUTOINCREMENT,
          outward_id INTEGER NOT NULL,
          sr_no INTEGER,
          item_name VARCHAR,
          uom VARCHAR,
          quantity NUMERIC,
          FOREIGN KEY (outward_id) REFERENCES outward_pass (outward_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating outward_pass_item table:', err);
        } else {
          console.log('Outward_pass_item table created or already exists');
        }
      });

      // Create profiles table
      db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
          id TEXT PRIMARY KEY,
          name TEXT,
          warehouse_id INTEGER,
          role TEXT DEFAULT 'warehouse_user',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (warehouse_id) REFERENCES warehouses (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating profiles table:', err);
        } else {
          console.log('Profiles table created or already exists');
        }
      });

      // Create inward_product_movement table
      db.run(`
        CREATE TABLE IF NOT EXISTS inward_product_movement (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          inward_id INTEGER NOT NULL,
          item_id INTEGER,
          product_name TEXT NOT NULL,
          warehouse_name TEXT,
          quantity_before INTEGER DEFAULT 0,
          quantity_added INTEGER DEFAULT 0,
          quantity_after INTEGER DEFAULT 0,
          movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          grn_no INTEGER,
          supplier_name TEXT,
          FOREIGN KEY (inward_id) REFERENCES inward_pass (inward_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating inward_product_movement table:', err);
        } else {
          console.log('Inward_product_movement table created or already exists');
        }
      });

      // Create outward_product_movement table
      db.run(`
        CREATE TABLE IF NOT EXISTS outward_product_movement (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          outward_id INTEGER NOT NULL,
          item_id INTEGER,
          product_name TEXT NOT NULL,
          warehouse_name TEXT,
          quantity_before INTEGER DEFAULT 0,
          quantity_issued INTEGER DEFAULT 0,
          quantity_after INTEGER DEFAULT 0,
          movement_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          gin_no INTEGER,
          part_name TEXT,
          FOREIGN KEY (outward_id) REFERENCES outward_pass (outward_id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating outward_product_movement table:', err);
        } else {
          console.log('Outward_product_movement table created or already exists');
        }
      });

      // Add indexes for product movement tables
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_product_movement_date ON inward_product_movement(movement_date)`, (err) => {
        if (err) console.error('Error creating index on inward_product_movement_date:', err);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_outward_product_movement_date ON outward_product_movement(movement_date)`, (err) => {
        if (err) console.error('Error creating index on outward_product_movement_date:', err);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_inward_product_movement_product ON inward_product_movement(product_name)`, (err) => {
        if (err) console.error('Error creating index on inward_product_movement_product:', err);
      });
      db.run(`CREATE INDEX IF NOT EXISTS idx_outward_product_movement_product ON outward_product_movement(product_name)`, (err) => {
        if (err) console.error('Error creating index on outward_product_movement_product:', err);
      });
      
      // Verify tables were created
      db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='inward_product_movement'`, (err, row) => {
        if (err) {
          console.error('Error checking for inward_product_movement table:', err);
        } else if (row) {
          console.log('inward_product_movement table exists');
        } else {
          console.log('inward_product_movement table does not exist');
        }
      });
      
      db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='outward_product_movement'`, (err, row) => {
        if (err) {
          console.error('Error checking for outward_product_movement table:', err);
        } else if (row) {
          console.log('outward_product_movement table exists');
        } else {
          console.log('outward_product_movement table does not exist');
        }
      });

    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
  }
}

// Initialize database when app is ready
app.whenReady().then(() => {
  initializeDatabase();
});

// Keep a global reference of the window object
let mainWindow

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../logo.png'), // Path to your app icon
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  })

  // Load the app
  if (isDev) {
    // Development: load from Vite dev server on new port
    mainWindow.loadURL('http://localhost:5175').catch(err => {
      console.log('Failed to load dev server URL:', err);
      // Fallback to loading built files if dev server is not available
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html')).catch(fallbackErr => {
        console.log('Failed to load fallback file:', fallbackErr);
      });
    });
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from built files
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html')).catch(err => {
      console.log('Failed to load production file:', err);
    });
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Focus on the window
    if (isDev) {
      mainWindow.focus();
    }
  });

  // Handle loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Failed to load page:', errorCode, errorDescription);
    // Try to load fallback content
    mainWindow.webContents.loadFile(path.join(__dirname, '../../dist/index.html')).catch(err => {
      console.log('Failed to load fallback content:', err);
    });
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })
}

// App event listeners
app.whenReady().then(() => {
  createWindow()
  
  // Remove the application menu
  Menu.setApplicationMenu(null)
  
  // macOS specific: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Security: Prevent navigation to external websites
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl)
    
    // Updated to new port
    if (parsedUrl.origin !== 'http://localhost:5175' && parsedUrl.origin !== 'file://') { // Changed from 5174 to 5175
      event.preventDefault()
    }
  })
})

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            // Handle new file/item creation
            mainWindow.webContents.send('menu-new-item')
          }
        },
        {
          label: 'Export',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            // Handle export functionality
            const { filePath } = await dialog.showSaveDialog(mainWindow, {
              title: 'Export Inventory Data',
              defaultPath: 'inventory-export.json',
              filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            })
            
            if (filePath) {
              mainWindow.webContents.send('menu-export', filePath)
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit()
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Inventory',
      submenu: [
        {
          label: 'Add Item',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-add-item')
          }
        },
        {
          label: 'Issue Note',
          accelerator: 'CmdOrCtrl+Shift+I',
          click: () => {
            mainWindow.webContents.send('menu-issue-note')
          }
        },
        {
          label: 'Refresh Data',
          accelerator: 'F5',
          click: () => {
            mainWindow.webContents.send('menu-refresh')
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Inventory Manager',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Inventory Manager',
              message: 'Inventory Manager',
              detail: 'A modern inventory management application built with React and Electron.'
            })
          }
        }
      ]
    }
  ]

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    })
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(null)
}

// IPC handlers for communication with renderer process
ipcMain.handle('app-version', () => {
  return app.getVersion()
})

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options)
  return result
})

ipcMain.handle('show-error-box', (event, title, content) => {
  dialog.showErrorBox(title, content)
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

// Handle database operations through IPC
ipcMain.handle('db-get-warehouses', () => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name FROM warehouses ORDER BY name', (err, rows) => {
      if (err) {
        console.error('Error getting warehouses:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

ipcMain.handle('db-get-inventory', (event, warehouseId) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    if (warehouseId) {
      db.all(`
        SELECT i.*, w.name as warehouse_name 
        FROM inventory i 
        JOIN warehouses w ON i.warehouse_id = w.id 
        WHERE i.warehouse_id = ? 
        ORDER BY i.product_name
      `, [warehouseId], (err, rows) => {
        if (err) {
          console.error('Error getting inventory:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    } else {
      db.all(`
        SELECT i.*, w.name as warehouse_name 
        FROM inventory i 
        JOIN warehouses w ON i.warehouse_id = w.id 
        ORDER BY i.product_name
      `, (err, rows) => {
        if (err) {
          console.error('Error getting inventory:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      });
    }
  });
})

ipcMain.handle('db-get-product-warehouse-quantities', () => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT 
        TRIM(i.product_name) as product_name,
        TRIM(w.name) as warehouse_name,
        SUM(CAST(i.quantity AS INTEGER)) as quantity
      FROM inventory i
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE TRIM(i.product_name) != '' 
        AND TRIM(w.name) != '' 
        AND i.quantity IS NOT NULL 
        AND i.quantity != '' 
        AND CAST(i.quantity AS INTEGER) >= 0
      GROUP BY TRIM(i.product_name), TRIM(w.name)
      ORDER BY TRIM(i.product_name), TRIM(w.name)
    `, (err, rows) => {
      if (err) {
        console.error('Error getting product warehouse quantities:', err);
        resolve([]);
      } else {
        // Ensure quantity is properly parsed as integer and filter out invalid rows
        const validRows = (rows || [])
          .map(row => ({
            ...row,
            quantity: parseInt(row.quantity) || 0
          }))
          .filter(row => row.product_name && row.warehouse_name);
        
        console.log('Product warehouse quantities fetched:', validRows.length, 'rows');
        console.log('Raw data:', rows);
        console.log('Processed data:', validRows);
        resolve(validRows);
      }
    });
  });
});

ipcMain.handle('db-add-inventory-item', (event, item) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO inventory (warehouse_id, product_name, quantity) 
      VALUES (?, ?, ?)
    `, [item.warehouse_id, item.product_name, item.quantity], function(err) {
      if (err) {
        console.error('Error adding inventory item:', err);
        resolve(null);
      } else {
        resolve(this.lastID);
      }
    });
  });
})

ipcMain.handle('db-update-inventory-item', (event, id, item) => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    db.run(`
      UPDATE inventory 
      SET product_name = ?, quantity = ?, warehouse_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [item.product_name, item.quantity, item.warehouse_id, id], function(err) {
      if (err) {
        console.error('Error updating inventory item:', err);
        resolve(false);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
})

ipcMain.handle('db-delete-inventory-item', (event, id) => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM inventory WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Error deleting inventory item:', err);
        resolve(false);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
})

ipcMain.handle('db-get-outward-passes', (event, startDate, endDate, godown) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT * FROM outward_pass 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      // Use date comparison that works with different date formats
      query += ' AND date(date_issued) >= date(?) AND date(date_issued) <= date(?)';
      params.push(startDate, endDate);
    }

    if (godown) {
      query += ' AND godown = ?';
      params.push(godown);
    }

    query += ' ORDER BY date_issued DESC';

    console.log('Executing outward passes query:', query, params);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting outward passes:', err);
        resolve([]);
      } else {
        console.log('Outward passes result:', rows);
        resolve(rows || []);
      }
    });
  });
})

ipcMain.handle('db-get-outward-pass-with-items', (event, id) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    console.log('Fetching outward pass with items for ID:', id);
    
    db.get('SELECT * FROM outward_pass WHERE outward_id = ?', [id], (err, pass) => {
      if (err) {
        console.error('Error getting outward pass:', err);
        resolve(null);
      } else if (pass) {
        console.log('Found outward pass:', pass);
        
        db.all('SELECT * FROM outward_pass_item WHERE outward_id = ? ORDER BY sr_no', [id], (err, items) => {
          if (err) {
            console.error('Error getting outward pass items:', err);
            resolve(null);
          } else {
            console.log('Found outward pass items:', items);
            resolve({ ...pass, outward_pass_item: items || [] });
          }
        });
      } else {
        console.log('No outward pass found for ID:', id);
        resolve(null);
      }
    });
  });
})

ipcMain.handle('db-add-outward-pass', (event, pass) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO outward_pass 
      (gin_no, bill_no, date_issued, godown, part_name, contact_person, approved_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      pass.gin_no, 
      pass.bill_no, 
      pass.date_issued, 
      pass.godown, 
      pass.part_name, 
      pass.contact_person, 
      pass.approved_by
    ], function(err) {
      if (err) {
        console.error('Error adding outward pass:', err);
        resolve(null);
      } else {
        resolve(this.lastID);
      }
    });
  });
})

ipcMain.handle('db-add-outward-pass-items', (event, items) => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO outward_pass_item 
      (outward_id, sr_no, item_name, uom, quantity) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.serialize(() => {
      let success = true;
      items.forEach(item => {
        stmt.run([item.outward_id, item.sr_no, item.item_name, item.uom, item.quantity], function(err) {
          if (err) {
            console.error('Error adding outward pass item:', err);
            success = false;
          }
        });
      });
      
      stmt.finalize(() => {
        resolve(success);
      });
    });
  });
})

ipcMain.handle('db-update-inventory-quantity', (event, id, newQuantity) => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    db.run('UPDATE inventory SET quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newQuantity, id], function(err) {
      if (err) {
        console.error('Error updating inventory quantity:', err);
        resolve(false);
      } else {
        resolve(this.changes > 0);
      }
    });
  });
})

ipcMain.handle('db-get-next-gin-number', () => {
  if (!db) return 1;
  return new Promise((resolve, reject) => {
    db.get('SELECT MAX(gin_no) as max_gin FROM outward_pass', (err, row) => {
      if (err) {
        console.error('Error getting next GIN number:', err);
        resolve(1);
      } else {
        resolve((row.max_gin || 0) + 1);
      }
    });
  });
})

ipcMain.handle('db-get-outward-pass-items', (event, startDate, endDate, godown) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT opi.*, op.date_issued, op.godown
      FROM outward_pass_item opi
      JOIN outward_pass op ON opi.outward_id = op.outward_id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND op.date_issued >= ? AND op.date_issued <= ?';
      params.push(startDate, endDate);
    }

    if (godown) {
      query += ' AND op.godown = ?';
      params.push(godown);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting outward pass items:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

ipcMain.handle('db-get-low-stock-items', (event, threshold) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT i.product_name, i.quantity, w.name as warehouse_name
      FROM inventory i
      JOIN warehouses w ON i.warehouse_id = w.id
      WHERE i.quantity < ?
      ORDER BY i.quantity ASC
      LIMIT 10
    `, [threshold || 10], (err, rows) => {
      if (err) {
        console.error('Error getting low stock items:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

// Inward Pass IPC Handlers
ipcMain.handle('db-get-inward-passes', (event, startDate, endDate, godown) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT * FROM inward_pass 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      // Use date comparison that works with different date formats
      query += ' AND date(date_received) >= date(?) AND date(date_received) <= date(?)';
      params.push(startDate, endDate);
    }

    if (godown) {
      query += ' AND godown = ?';
      params.push(godown);
    }

    query += ' ORDER BY date_received DESC';

    console.log('Executing inward passes query:', query, params);

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting inward passes:', err);
        resolve([]);
      } else {
        console.log('Inward passes result:', rows);
        resolve(rows || []);
      }
    });
  });
});

ipcMain.handle('db-get-inward-pass-with-items', (event, id) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM inward_pass WHERE inward_id = ?', [id], (err, pass) => {
      if (err) {
        console.error('Error getting inward pass:', err);
        resolve(null);
      } else if (pass) {
        db.all('SELECT * FROM inward_pass_item WHERE inward_id = ? ORDER BY sr_no', [id], (err, items) => {
          if (err) {
            console.error('Error getting inward pass items:', err);
            resolve(null);
          } else {
            resolve({ ...pass, inward_pass_item: items || [] });
          }
        });
      } else {
        resolve(null);
      }
    });
  });
})

ipcMain.handle('db-add-inward-pass', (event, pass) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO inward_pass 
      (grn_no, bill_no, date_received, godown, supplier_name, contact_person, approved_by) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      pass.grn_no, 
      pass.bill_no, 
      pass.date_received, 
      pass.godown, 
      pass.supplier_name, 
      pass.contact_person, 
      pass.approved_by
    ], function(err) {
      if (err) {
        console.error('Error adding inward pass:', err);
        resolve(null);
      } else {
        resolve(this.lastID);
      }
    });
  });
})

ipcMain.handle('db-add-inward-pass-items', (event, items) => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO inward_pass_item 
      (inward_id, sr_no, item_name, uom, quantity) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    db.serialize(() => {
      let success = true;
      items.forEach(item => {
        stmt.run([item.inward_id, item.sr_no, item.item_name, item.uom, item.quantity], function(err) {
          if (err) {
            console.error('Error adding inward pass item:', err);
            success = false;
          }
        });
      });
      
      stmt.finalize(() => {
        resolve(success);
      });
    });
  });
})

ipcMain.handle('db-get-next-grn-number', () => {
  if (!db) return 1;
  return new Promise((resolve, reject) => {
    db.get('SELECT MAX(grn_no) as max_grn FROM inward_pass', (err, row) => {
      if (err) {
        console.error('Error getting next GRN number:', err);
        resolve(1);
      } else {
        resolve((row.max_grn || 0) + 1);
      }
    });
  });
})

ipcMain.handle('db-get-inward-pass-items', (event, startDate, endDate, godown) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT ipi.*, ip.date_received, ip.godown
      FROM inward_pass_item ipi
      JOIN inward_pass ip ON ipi.inward_id = ip.inward_id
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND ip.date_received >= ? AND ip.date_received <= ?';
      params.push(startDate, endDate);
    }

    if (godown) {
      query += ' AND ip.godown = ?';
      params.push(godown);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting inward pass items:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

// Handle app updates (if you plan to implement auto-updates)
ipcMain.handle('check-for-updates', () => {
  // Implementation for checking updates would go here
  return { hasUpdate: false, version: app.getVersion() }
})

// Handle application data paths
ipcMain.handle('get-app-data-path', () => {
  return app.getPath('userData')
})

ipcMain.handle('get-temp-path', () => {
  return app.getPath('temp')
})

// Product Movement IPC Handlers
ipcMain.handle('db-add-inward-product-movement', (event, movement) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO inward_product_movement 
      (inward_id, product_name, warehouse_name, quantity_before, quantity_added, quantity_after, movement_date, grn_no, supplier_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      movement.inward_id,
      movement.product_name,
      movement.warehouse_name,
      movement.quantity_before,
      movement.quantity_added,
      movement.quantity_after,
      movement.movement_date || new Date().toISOString(),
      movement.grn_no,
      movement.supplier_name
    ], function(err) {
      if (err) {
        console.error('Error adding inward product movement:', err);
        resolve(null);
      } else {
        resolve(this.lastID);
      }
    });
  });
})

ipcMain.handle('db-add-outward-product-movement', (event, movement) => {
  if (!db) return null;
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO outward_product_movement 
      (outward_id, product_name, warehouse_name, quantity_before, quantity_issued, quantity_after, movement_date, gin_no, part_name) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      movement.outward_id,
      movement.product_name,
      movement.warehouse_name,
      movement.quantity_before,
      movement.quantity_issued,
      movement.quantity_after,
      movement.movement_date || new Date().toISOString(),
      movement.gin_no,
      movement.part_name
    ], function(err) {
      if (err) {
        console.error('Error adding outward product movement:', err);
        resolve(null);
      } else {
        resolve(this.lastID);
      }
    });
  });
})

ipcMain.handle('db-get-inward-product-movements', (event, startDate, endDate, warehouseName) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT * FROM inward_product_movement 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND date(movement_date) >= date(?) AND date(movement_date) <= date(?)';
      params.push(startDate, endDate);
    }

    if (warehouseName) {
      query += ' AND warehouse_name = ?';
      params.push(warehouseName);
    }

    query += ' ORDER BY movement_date DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting inward product movements:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

ipcMain.handle('db-get-outward-product-movements', (event, startDate, endDate, warehouseName) => {
  if (!db) return [];
  return new Promise((resolve, reject) => {
    let query = `
      SELECT * FROM outward_product_movement 
      WHERE 1=1
    `;
    const params = [];

    if (startDate && endDate) {
      query += ' AND date(movement_date) >= date(?) AND date(movement_date) <= date(?)';
      params.push(startDate, endDate);
    }

    if (warehouseName) {
      query += ' AND warehouse_name = ?';
      params.push(warehouseName);
    }

    query += ' ORDER BY movement_date DESC';

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error getting outward product movements:', err);
        resolve([]);
      } else {
        resolve(rows || []);
      }
    });
  });
})

// Function to erase all data (not tables)
ipcMain.handle('erase-all-data', () => {
  if (!db) return false;
  return new Promise((resolve, reject) => {
    // List of tables to clear data from
    const tables = [
      'inward_pass',
      'inward_pass_item',
      'outward_pass',
      'outward_pass_item',
      'inventory',
      'inward_product_movement',
      'outward_product_movement'
    ];
    
    // Clear data from each table
    let completed = 0;
    let hasError = false;
    
    tables.forEach(table => {
      db.run(`DELETE FROM ${table}`, (err) => {
        completed++;
        if (err) {
          console.error(`Error clearing data from ${table}:`, err);
          hasError = true;
        }
        
        // Check if all tables have been processed
        if (completed === tables.length) {
          if (hasError) {
            resolve(false);
          } else {
            console.log('All data erased successfully');
            resolve(true);
          }
        }
      });
    });
  });
})

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Handle certificate errors (for development)
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (isDev) {
    // In development, ignore certificate errors
    event.preventDefault()
    callback(true)
  } else {
    // In production, use default behavior
    callback(false)
  }
})