Agentic AI Shopping (Backend)

This backend implements:
- FastAPI server
- In-memory fake database with 10 dummy users and sample products
- RSA utilities for encrypt/decrypt used by the gateway
- Fake bank and payment gateway that processes RSA-encrypted payment payloads
- A simple agent that parses chat commands and initiates purchases

To run:

1. Create a venv and install requirements:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

2. Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

APIs:
- POST /login {"phone": "..."} -> {token, user}
- GET /products -> list of products
- POST /agent/chat {"token":"...","message":"buy me X"}
- POST /gateway/pay {"payload":"<base64-RSA-encrypted>"}

Keys will be generated on first run and stored in `app/keys/`.
