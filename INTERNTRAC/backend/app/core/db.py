import json
import os
import threading
from typing import Dict, Any, List

class JSONDatabase:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(JSONDatabase, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self, file_path: str = "db.json"):
        if not hasattr(self, 'initialized'):
            self.file_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), file_path)
            self.data: Dict[str, List[Dict[str, Any]]] = {
                "users": [],
                "institute_profiles": [],
                "student_profiles": [],
                "company_profiles": [],
                "internships": [],
                "applications": [],
                "noc_requests": [],
                "attendance_logs": [],
                "mentor_feedbacks": [],
                "notifications": [],
                "internship_tasks": []
            }
            self.load()
            self.initialized = True

    def load(self):
        with self._lock:
            if os.path.exists(self.file_path):
                with open(self.file_path, "r", encoding="utf-8") as f:
                    try:
                        loaded_data = json.load(f)
                        # Ensure all default keys exist
                        for key in self.data.keys():
                            if key in loaded_data:
                                self.data[key] = loaded_data[key]
                    except json.JSONDecodeError:
                        pass
            else:
                self.save_nolock()

    def save_nolock(self):
        with open(self.file_path, "w", encoding="utf-8") as f:
            json.dump(self.data, f, indent=4)

    def commit(self):
        with self._lock:
            self.save_nolock()

# Global instance
db_instance = JSONDatabase()

def get_db():
    # Dependency injection for FastAPI
    return db_instance
