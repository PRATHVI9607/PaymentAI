# PaymentAI: AI Shopping Assistant

A conversational AI-powered shopping assistant that allows users to find products, manage their balance, and make secure purchases using natural language commands.

---

## 🚀 Project Overview

PaymentAI is a full-stack web application demonstrating a conversational user interface (CUI) for e-commerce. It features a React frontend and a FastAPI backend. The core of the project is an "agent" that interprets user requests, interacts with a simulated database, and executes financial transactions through a secure, RSA-encrypted payment gateway.

## ✨ Key Features

-   **Conversational Interface:** Interact with the shopping assistant using natural language (e.g., "buy me a wireless mouse for under $50").
-   **AI-Powered Agent:** Parses user intent to handle actions like buying, transferring money, and checking balances.
-   **Secure Transaction Simulation:** All payment payloads are encrypted using RSA public-key cryptography before being sent to the payment gateway.
-   **Stateless Authentication:** Uses session tokens for secure communication between the frontend and backend.
-   **In-Memory Database:** Comes pre-populated with demo users, products, and bank accounts for easy testing.
-   **Modern Tech Stack:** Built with React (Vite) on the frontend and FastAPI on the backend.

---

## ⚙️ How It Works

The project is a monorepo with two main parts: a `frontend` application and a `backend` server.

### Backend (FastAPI)

The backend is the brain of the operation, handling logic, data, and security.

-   **`agent.py`**: The core logic for the AI assistant. It uses regular expressions to parse commands and manages a state for multi-step actions (like asking for purchase confirmation).
-   **`db.py`**: A simulated in-memory database that is populated with 10 demo users, sample products, and bank accounts on server start.
-   **`gateway.py` & `bank.py`**: These files simulate a payment ecosystem. The `gateway` receives encrypted payment requests, decrypts them with a private key, and instructs the `bank` to perform the transaction.
-   **Authentication**: A user logs in with a phone number and receives a session token. This token is sent in the `Authorization` header for all subsequent authenticated API calls.

### Frontend (React)

A modern single-page application built with React and Vite that provides the user interface.

-   **`App.jsx`**: The main component that manages application state, including the user's session, authentication status, and UI layout.
-   **`api.js`**: A centralized module for all communication with the backend API. It handles attaching the authentication token to requests and processing responses.
-   **Components**: The UI is broken down into logical components for login (`Login.jsx`), chat (`Chat.jsx`), and displaying data (`Activities.jsx`, `Transactions.jsx`).

### The Secure Payment Flow

1.  A user confirms a purchase or transfer via the chat interface.
2.  The backend **agent** constructs a JSON payload with the transaction details.
3.  This payload is **encrypted** using an RSA public key.
4.  The encrypted data is sent to the `/gateway/pay` endpoint.
5.  The **payment gateway** receives the encrypted payload and **decrypts** it using the corresponding RSA private key.
6.  The gateway validates the transaction and instructs the **bank** to move the funds.

---

## 🛠️ How to Run on Your Device

Follow these steps to get the project running locally.

**Prerequisites:**
*   Node.js and npm
*   Python 3.7+ and pip

### 1. Backend Setup (FastAPI)

First, set up and run the backend server.

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a Python virtual environment
# On macOS/Linux:
python3 -m venv .venv
source .venv/bin/activate
# On Windows:
# python -m venv .venv
# .\.venv\Scripts\activate

# 3. Install the required Python packages
pip install -r requirements.txt

# 4. Start the FastAPI server
uvicorn app.main:app --reload --port 8000
```
The backend is now running at `http://localhost:8000`.

### 2. Frontend Setup (React)

In a **new terminal**, set up and run the frontend application.

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install the Node.js dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
The frontend will open in your browser, typically at `http://localhost:5173`.

---

## 📖 Usage Guide

1.  Open the frontend URL in your browser.
2.  Log in using one of the demo phone numbers: **`+10000000001`** to **`+10000000010`**.
3.  Once logged in, use the chat interface to interact with the assistant. Try these commands:
    *   `check balance`
    *   `buy me a wireless mouse`
    *   `I want headphones for under $100`
    *   `send $10 to +10000000002`
    *   `send 25 dollars to User2`
4.  When prompted for confirmation, reply with `yes` or `confirm`.

## 🔌 API Endpoints

The backend provides an interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.

-   `POST /login`: Authenticate a user and get a session token.
-   `GET /products`: List all available products.
-   `POST /agent/chat`: Send a message to the AI assistant.
-   `GET /transactions/{user_id}`: Get a user's transaction history.
-   `GET /activities/{user_id}`: Get a user's activity log.
-   `POST /gateway/pay`: (Internal) Process an RSA-encrypted payment payload.


