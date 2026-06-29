# Telegram Referral & Task Reward Bot

A production-ready Telegram bot system with a built-in web-based admin dashboard.

## Features

- **User Registration**: Automatic registration on `/start`.
- **Referral System**: Generates unique links. Rewards are only given after the referred user completes all required tasks.
- **Task System**: Admin can create tasks (TG channels, websites, etc.). Users earn rewards upon verification.
- **Wallet & Withdrawals**: Users can setup wallets (TRC20, BEP20, etc.) and request withdrawals.
- **Admin Dashboard**: Web UI to manage users, tasks, withdraws, and broadcast messages.
- **Security**: Secured with Firebase Authentication (Admin only) and safe database transactions.

## Tech Stack

- **Backend**: Node.js (Express)
- **Bot Framework**: Grammy
- **Database**: PostgreSQL (Drizzle ORM)
- **Frontend**: React (Vite, Tailwind CSS, shadcn/ui)
- **Authentication**: Firebase Auth

## Setup Instructions

1. **Telegram Bot Token**:
   - Create a bot via [@BotFather](https://t.me/BotFather).
   - Add the token to your secrets as `TELEGRAM_BOT_TOKEN`.

2. **Database**:
   - This app uses Google Cloud SQL (PostgreSQL). Ensure it's provisioned via the AI Studio UI.

3. **Admin Access**:
   - The first person to log into the web admin panel will automatically be granted admin permissions.
   - You can add more admins manually in the `admins` database table.

## Development

- `npm run dev`: Starts the Express server and the Telegram bot.
- `npm run build`: Compiles the React frontend and the Node.js backend.
- `npm run start`: Runs the production-ready bundle.

## Environment Variables

- `TELEGRAM_BOT_TOKEN`: Your Telegram bot API token.
- `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME`: Database credentials (automatically provided).
- `APP_URL`: The URL where the app is hosted (for webhooks).
