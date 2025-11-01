import os
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import serialization, hashes
from base64 import b64encode, b64decode

KEY_DIR = os.path.join(os.path.dirname(__file__), "keys")
GATEWAY_PRIV = os.path.join(KEY_DIR, "gateway_priv.pem")
GATEWAY_PUB = os.path.join(KEY_DIR, "gateway_pub.pem")

def ensure_keys():
    os.makedirs(KEY_DIR, exist_ok=True)
    if not (os.path.exists(GATEWAY_PRIV) and os.path.exists(GATEWAY_PUB)):
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pem_priv = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        with open(GATEWAY_PRIV, "wb") as f:
            f.write(pem_priv)

        public_key = private_key.public_key()
        pem_pub = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        with open(GATEWAY_PUB, "wb") as f:
            f.write(pem_pub)

def load_private_key(path=GATEWAY_PRIV):
    with open(path, "rb") as f:
        return serialization.load_pem_private_key(f.read(), password=None)

def load_public_key(path=GATEWAY_PUB):
    with open(path, "rb") as f:
        return serialization.load_pem_public_key(f.read())

def encrypt_with_public(data: bytes, pub_key) -> str:
    ct = pub_key.encrypt(data, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    return b64encode(ct).decode()

def decrypt_with_private(b64cipher: str, priv_key) -> bytes:
    ct = b64decode(b64cipher)
    pt = priv_key.decrypt(ct, padding.OAEP(mgf=padding.MGF1(algorithm=hashes.SHA256()),algorithm=hashes.SHA256(),label=None))
    return pt

ensure_keys()
