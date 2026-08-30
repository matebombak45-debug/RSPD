# RCPD Private Server

This lightweight server stores user login information locally in `server/users.json` (hashed passwords) and serves the frontend.

Quick start:

```bash
cd server
npm install
npm start
```

The app will be available at `http://localhost:3000` and exposes API endpoints:
- `POST /api/register` { fullName, badge, password, rank } — create a new user
- `POST /api/login` { badge, password } — authenticate

Note: this stores data locally on the machine in `server/users.json`. Passwords are hashed with `bcryptjs`.
