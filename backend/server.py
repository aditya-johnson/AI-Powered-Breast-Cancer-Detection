from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
import base64
from io import BytesIO
from PIL import Image
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'breast_cancer_detection')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret-key')
JWT_ALGORITHM = "HS256"
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app without a prefix
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class MedicalHistory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    age: int
    family_history: bool
    previous_biopsies: bool
    hormone_therapy: bool
    first_pregnancy_age: Optional[int] = None
    menstruation_age: Optional[int] = None
    breast_density: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MedicalHistoryCreate(BaseModel):
    age: int
    family_history: bool
    previous_biopsies: bool
    hormone_therapy: bool
    first_pregnancy_age: Optional[int] = None
    menstruation_age: Optional[int] = None
    breast_density: Optional[str] = None

class Analysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    analysis_type: str  # "image" or "risk_assessment"
    result: str
    risk_level: str  # "low", "moderate", "high"
    recommendations: List[str]
    image_data: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RiskAssessmentRequest(BaseModel):
    age: int
    family_history: bool
    previous_biopsies: bool
    hormone_therapy: bool
    first_pregnancy_age: Optional[int] = None
    menstruation_age: Optional[int] = None
    breast_density: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(email=user_data.email, full_name=user_data.full_name)
    user_doc = user.model_dump()
    user_doc['created_at'] = user_doc['created_at'].isoformat()
    user_doc['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(user_doc)
    
    token = create_token(user.id, user.email)
    return {"token": token, "user": user.model_dump()}

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc or not verify_password(credentials.password, user_doc.get('password', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user_doc['id'], user_doc['email'])
    user = User(
        id=user_doc['id'],
        email=user_doc['email'],
        full_name=user_doc['full_name'],
        created_at=datetime.fromisoformat(user_doc['created_at']) if isinstance(user_doc['created_at'], str) else user_doc['created_at']
    )
    return {"token": token, "user": user.model_dump()}

@api_router.get("/auth/me")
async def get_me(user_id: str = Depends(get_current_user)):
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    return user_doc

# Medical history endpoints
@api_router.post("/medical-history", response_model=MedicalHistory)
async def create_medical_history(data: MedicalHistoryCreate, user_id: str = Depends(get_current_user)):
    # Delete existing history for user
    await db.medical_history.delete_many({"user_id": user_id})
    
    history = MedicalHistory(user_id=user_id, **data.model_dump())
    history_doc = history.model_dump()
    history_doc['created_at'] = history_doc['created_at'].isoformat()
    
    await db.medical_history.insert_one(history_doc)
    return history

@api_router.get("/medical-history")
async def get_medical_history(user_id: str = Depends(get_current_user)):
    history = await db.medical_history.find_one({"user_id": user_id}, {"_id": 0})
    return history

# AI Analysis endpoints
@api_router.post("/analyze-image")
async def analyze_image(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    try:
        # Read and validate image
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        
        # Convert to base64
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        img_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Analyze with AI
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"analysis_{user_id}_{uuid.uuid4()}",
            system_message="You are an AI medical assistant specialized in breast cancer detection. Analyze mammogram images and provide detailed insights about potential abnormalities, their characteristics, and recommendations. Always include a risk assessment (low, moderate, or high) and actionable next steps."
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=img_base64)
        message = UserMessage(
            text="Please analyze this mammogram image for any signs of abnormalities or potential breast cancer indicators. Provide: 1) Detailed findings, 2) Risk level (low/moderate/high), 3) Specific recommendations for next steps.",
            file_contents=[image_content]
        )
        
        ai_response = await chat.send_message(message)
        
        # Parse response to extract risk level
        response_lower = ai_response.lower()
        if "high risk" in response_lower or "high-risk" in response_lower:
            risk_level = "high"
        elif "moderate risk" in response_lower or "moderate" in response_lower:
            risk_level = "moderate"
        else:
            risk_level = "low"
        
        # Extract recommendations
        recommendations = [
            "Consult with a healthcare professional",
            "Schedule a follow-up examination",
            "Maintain regular screening schedule"
        ]
        
        # Save analysis
        analysis = Analysis(
            user_id=user_id,
            analysis_type="image",
            result=ai_response,
            risk_level=risk_level,
            recommendations=recommendations,
            image_data=img_base64[:1000]  # Store thumbnail
        )
        
        analysis_doc = analysis.model_dump()
        analysis_doc['created_at'] = analysis_doc['created_at'].isoformat()
        await db.analyses.insert_one(analysis_doc)
        
        return analysis.model_dump(exclude={"image_data"})
        
    except Exception as e:
        logging.error(f"Error analyzing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing image: {str(e)}")

@api_router.post("/risk-assessment")
async def risk_assessment(
    data: RiskAssessmentRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        # Calculate risk score
        risk_score = 0
        
        if data.age > 50:
            risk_score += 3
        elif data.age > 40:
            risk_score += 2
        elif data.age > 30:
            risk_score += 1
            
        if data.family_history:
            risk_score += 4
        if data.previous_biopsies:
            risk_score += 3
        if data.hormone_therapy:
            risk_score += 2
        if data.breast_density == "dense":
            risk_score += 2
        
        # Determine risk level
        if risk_score >= 8:
            risk_level = "high"
        elif risk_score >= 4:
            risk_level = "moderate"
        else:
            risk_level = "low"
        
        # Generate AI insights
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"risk_assessment_{user_id}_{uuid.uuid4()}",
            system_message="You are an AI medical assistant providing breast cancer risk assessments based on patient history and demographics."
        ).with_model("openai", "gpt-4o")
        
        prompt = f"""Based on the following patient information, provide a detailed breast cancer risk assessment:
        
Age: {data.age}
Family History: {'Yes' if data.family_history else 'No'}
Previous Biopsies: {'Yes' if data.previous_biopsies else 'No'}
Hormone Therapy: {'Yes' if data.hormone_therapy else 'No'}
First Pregnancy Age: {data.first_pregnancy_age or 'N/A'}
Menstruation Start Age: {data.menstruation_age or 'N/A'}
Breast Density: {data.breast_density or 'N/A'}

Provide a comprehensive risk analysis with specific recommendations."""
        
        message = UserMessage(text=prompt)
        ai_response = await chat.send_message(message)
        
        recommendations = [
            "Schedule annual mammogram screening",
            "Perform monthly self-examinations",
            "Maintain a healthy lifestyle",
            "Discuss results with your healthcare provider"
        ]
        
        if risk_level == "high":
            recommendations.insert(0, "Consult with an oncologist immediately")
            recommendations.insert(1, "Consider genetic testing")
        
        # Save analysis
        analysis = Analysis(
            user_id=user_id,
            analysis_type="risk_assessment",
            result=ai_response,
            risk_level=risk_level,
            recommendations=recommendations
        )
        
        analysis_doc = analysis.model_dump()
        analysis_doc['created_at'] = analysis_doc['created_at'].isoformat()
        await db.analyses.insert_one(analysis_doc)
        
        return analysis.model_dump()
        
    except Exception as e:
        logging.error(f"Error in risk assessment: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error in risk assessment: {str(e)}")

@api_router.get("/analyses", response_model=List[Analysis])
async def get_analyses(user_id: str = Depends(get_current_user)):
    analyses = await db.analyses.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for analysis in analyses:
        if isinstance(analysis['created_at'], str):
            analysis['created_at'] = datetime.fromisoformat(analysis['created_at'])
    
    return analyses

@api_router.get("/")
async def root():
    return {"message": "Breast Cancer Detection API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()