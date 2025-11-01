from datetime import datetime
import json

# ANSI color codes
COLORS = {
    'HEADER': '\033[95m',
    'BLUE': '\033[94m',
    'GREEN': '\033[92m',
    'YELLOW': '\033[93m',
    'RED': '\033[91m',
    'END': '\033[0m',
    'BOLD': '\033[1m'
}

def format_json(obj):
    """Format JSON with indentation and colors"""
    if isinstance(obj, (dict, list)):
        return json.dumps(obj, indent=2)
    return str(obj)

def log_request(method: str, path: str, data=None):
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f"{COLORS['HEADER']}[{timestamp}]{COLORS['END']} "
          f"{COLORS['BLUE']}→ {method}{COLORS['END']} "
          f"{COLORS['BOLD']}{path}{COLORS['END']}")
    if data:
        print(f"{COLORS['YELLOW']}Request Body:{COLORS['END']}\n{format_json(data)}\n")

def log_response(status_code: int, data=None):
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    color = COLORS['GREEN'] if status_code < 400 else COLORS['RED']
    print(f"{COLORS['HEADER']}[{timestamp}]{COLORS['END']} "
          f"{color}← {status_code}{COLORS['END']}")
    if data:
        print(f"{COLORS['YELLOW']}Response Body:{COLORS['END']}\n{format_json(data)}\n")

def log_error(message: str, error=None):
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f"{COLORS['HEADER']}[{timestamp}]{COLORS['END']} "
          f"{COLORS['RED']}❌ Error: {message}{COLORS['END']}")
    if error:
        print(f"{COLORS['RED']}{str(error)}{COLORS['END']}\n")

def log_info(message: str):
    timestamp = datetime.now().strftime('%H:%M:%S.%f')[:-3]
    print(f"{COLORS['HEADER']}[{timestamp}]{COLORS['END']} "
          f"{COLORS['BLUE']}ℹ {message}{COLORS['END']}\n")