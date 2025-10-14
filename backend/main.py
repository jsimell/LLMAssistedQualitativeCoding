from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai

# Create a FastAPI instance
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Input model
class APIkeyValidationRequest(BaseModel):
  openai_api_key: str

@app.post("/api/validate_api_key")
async def validate_api_key(req: APIkeyValidationRequest):
  ai_api = openai.OpenAI(api_key=req.openai_api_key)
  try: 
    response = ai_api.responses.create(
        model="gpt-4o-mini",
        input="hello"
    )
    return {"valid": True}
  except openai.AuthenticationError:
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Invalid API key"
    )
  except openai.OpenAIError as e:
    raise HTTPException(
      status_code=status.HTTP_502_BAD_GATEWAY,
      detail=f"OpenAI error: {str(e)}"
    )
  except Exception as e:
    raise HTTPException(
      status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
      detail="Internal server error"
      )