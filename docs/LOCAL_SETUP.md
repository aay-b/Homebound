# Local setup

## Install dependencies

```powershell
cd frontend
npm install
cd ../backend
npm install
```

## Create environment files

From the repository root:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Fill in the Supabase values in `backend/.env` when your feature needs database access. Do not commit `.env` files or expose the service-role key in frontend code.

## Run locally

Open two terminals:

```powershell
cd frontend
npm run dev
```

```powershell
cd backend
npm run dev
```

Open `http://localhost:5173`.
