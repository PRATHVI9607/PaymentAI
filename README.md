# PaymentAI - AI Shopping Assistant with Secure Payments

An AI-powered shopping assistant that helps users find and purchase products using natural language commands, with secure RSA-encrypted payment processing.

## Features

- Natural language shopping commands (e.g., "buy me a gaming mouse")
- AI-powered product search and selection
- Secure payment processing with RSA encryption
- In-memory fake banking system for demo purposes
- React frontend with chat interface
- FastAPI backend with stateless session management

## Project Structure

```
backend/         # FastAPI backend server
  app/          # Core application code
    agent.py    # AI shopping agent implementation
    bank.py     # Fake banking system
    gateway.py  # Payment gateway with RSA encryption
    models.py   # Data models
    main.py     # FastAPI application entry point
frontend/        # React frontend application
  src/          # Frontend source code
    App.jsx     # Main React application
    api.js      # API client utilities
```

## Setup & Running

### Backend Setup

1. Create a Python virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   uvicorn app.main:app --reload
   ```

The backend will be available at http://localhost:8000

### Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at http://localhost:5173

## Usage Guide

1. Open the frontend application in your browser
2. Log in using any phone number from the demo users (e.g., "1234567890")
3. Use natural language commands in the chat interface:
   - "buy me a gaming mouse"
   - "buy headphones"
   - "buy a mechanical keyboard"
4. The AI agent will:
   - Search for matching products
   - Select the best option
   - Process the payment securely
   - Show order confirmation

## Security Notes

- All payment data is encrypted using RSA before transmission
- Private keys are stored securely on the backend
- Public keys are shared with the frontend for payment encryption
- Demo uses an in-memory database - not suitable for production

## API Documentation

The backend provides a Swagger UI for API documentation at http://localhost:8000/docs

Key endpoints:
- POST /login - Authenticate user
- GET /products - List available products
- POST /agent/chat - Chat with shopping agent
- POST /gateway/pay - Process encrypted payments

## Development Notes

- Frontend uses Vite + React for fast development
- Backend uses FastAPI for high-performance API
- RSA encryption handled by cryptography package
- Stateless session management with UUIDs