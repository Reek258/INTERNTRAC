from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os


from app.api import auth, students, companies, institutes

# Create folders for uploads if they don't exist
os.makedirs("./uploads/resumes", exist_ok=True)
os.makedirs("./uploads/noc", exist_ok=True)
os.makedirs("./uploads/certificates", exist_ok=True)
os.makedirs("./uploads/tasks", exist_ok=True)
os.makedirs("./uploads/offer-letters", exist_ok=True)
os.makedirs("./uploads/profile-pictures", exist_ok=True)

app = FastAPI(
    title="INTERNTRAC API",
    description="Backend services and AI components for INTERNTRAC portal",
    version="1.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the react frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount files directory to serve PDF documents
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routers
app.include_router(auth.router, prefix="/api")
app.include_router(students.router, prefix="/api")
app.include_router(companies.router, prefix="/api")
app.include_router(institutes.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "app": "INTERNTRAC Portal API",
        "endpoints": [
            "/api/auth",
            "/api/students",
            "/api/companies",
            "/api/institutes"
        ]
    }
