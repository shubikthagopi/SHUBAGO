# SHUBAGO — Retail Pharmacy Management (PWA)

A simple offline-capable Progressive Web App for pharmacy operations. This is a demo starter app meant for local use and enhancements.

## Features
- Dashboard with quick metrics
- Sales / Billing with invoice creation and simple tax calculation
- Purchase entries that increase stock
- Inventory management with CRUD for products
- Basic Accounts ledger (lists invoices & purchases)
- Export / Import JSON for backup
- PWA support: manifest + service worker

## How to run
1. Unzip the folder.
2. Serve the folder via a static server (service workers require localhost or HTTPS):
   ```
   npx http-server
   ```
   or
   ```
   python -m http.server 8080
   ```
3. Open `http://localhost:8080` and use the app.

## Next steps / customization ideas
- Replace localStorage with server + REST API (Node/Express + DB).
- Add authentication, user roles (cashier, manager).
- Add barcode scanning & printer integration.
- Improve reports and add PDF/CSV export.
- Add advanced accounting & GST handling (region-specific).

