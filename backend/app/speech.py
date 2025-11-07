"""Speech and audio feedback system - Text only version"""
from threading import Thread, Lock
from queue import Queue
import time
from typing import Optional, Callable, List

class MessageQueue:
    """Thread-safe message queue for handling speech and audio feedback"""
    def __init__(self):
        self._queue = Queue()
        self._history: List[str] = []
        self._max_history = 100
        self._lock = Lock()
        self.is_active = True
        
        # Start worker thread
        self._worker = Thread(target=self._process_messages, daemon=True)
        self._worker.start()
    
    def _process_messages(self):
        """Message processing worker thread"""
        while self.is_active:
            try:
                message = self._queue.get()
                if message:
                    with self._lock:
                        self._history.append(message)
                        # Trim history if too long
                        if len(self._history) > self._max_history:
                            self._history = self._history[-self._max_history:]
                        # Print message to console for debugging/testing
                        print(f"🔊 {message}")
            except Exception as e:
                print(f"Error processing message: {e}")
            finally:
                self._queue.task_done()
            time.sleep(0.1)
    
    def add_message(self, message: str):
        """Add a message to the queue"""
        if message and self.is_active:
            self._queue.put(message)
    
    def get_history(self, limit: int = None) -> List[str]:
        """Get message history with optional limit"""
        with self._lock:
            if limit:
                return self._history[-limit:]
            return self._history.copy()
    
    def clear_history(self):
        """Clear message history"""
        with self._lock:
            self._history.clear()
    
    def stop(self):
        """Stop the message queue processing"""
        self.is_active = False

class AudioFeedback:
    """Audio feedback system - Currently text only with hooks for future voice integration"""
    def __init__(self):
        self.message_queue = MessageQueue()
        self.voice_enabled = False  # Flag for future voice integration
        self._speech_callbacks: List[Callable[[str], None]] = []
    
    def speak(self, text: str):
        """Queue text to be spoken/displayed"""
        if text:
            self.message_queue.add_message(text)
            # Call any registered callbacks (e.g., for UI updates)
            for callback in self._speech_callbacks:
                try:
                    callback(text)
                except Exception as e:
                    print(f"Error in speech callback: {e}")
    
    def speak_transaction(self, amount: float, transaction_type: str, details: dict = None):
        """Generate and queue a transaction message"""
        details = details or {}
        try:
            if transaction_type == "purchase":
                msg = f"Purchase complete. {details.get('item_name', 'Item')} purchased for ${amount:.2f}"
            elif transaction_type == "transfer_sent":
                msg = f"Transfer complete. ${amount:.2f} sent to {details.get('recipient_name', 'recipient')}"
            elif transaction_type == "transfer_received":
                msg = f"Transfer received. ${amount:.2f} from {details.get('sender_name', 'sender')}"
            elif transaction_type == "balance":
                msg = f"Your current balance is ${amount:.2f}"
            else:
                msg = f"Transaction complete. ${amount:.2f}"
            
            self.speak(msg)
        except Exception as e:
            print(f"Error in speak_transaction: {e}")
    
    def listen(self, timeout: int = 5, callback: Optional[Callable] = None) -> Optional[str]:
        """Placeholder for future voice input functionality"""
        return None
    
    def register_speech_callback(self, callback: Callable[[str], None]):
        """Register a callback for speech events"""
        if callback not in self._speech_callbacks:
            self._speech_callbacks.append(callback)
    
    def remove_speech_callback(self, callback: Callable[[str], None]):
        """Remove a registered speech callback"""
        if callback in self._speech_callbacks:
            self._speech_callbacks.remove(callback)
    
    def get_message_history(self, limit: int = None) -> List[str]:
        """Get speech message history"""
        return self.message_queue.get_history(limit)
    
    def clear_message_history(self):
        """Clear speech message history"""
        self.message_queue.clear_history()

# Global instance
voice = AudioFeedback()