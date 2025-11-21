import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

from models.user import TokenData

load_dotenv()

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # ⭐ Ensure user_id is string if present
    if "user_id" in to_encode:
        to_encode["user_id"] = str(to_encode["user_id"])
    
    print(f"DEBUG create_access_token: Creating token with data: {to_encode}")
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, credentials_exception) -> TokenData:
    """Verify and decode a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: str = payload.get("user_id")
        
        print(f"DEBUG verify_token: Decoded payload: email={email}, user_id={user_id}, user_id_type={type(user_id)}")
        
        if email is None:
            print("DEBUG verify_token: Email is None, raising exception")
            raise credentials_exception
        
        # ⭐ Ensure user_id is string if present
        if user_id is not None:
            user_id = str(user_id)
        
        token_data = TokenData(email=email, user_id=user_id)
        
        print(f"DEBUG verify_token: TokenData created: email={token_data.email}, user_id={token_data.user_id}")
        
        return token_data
    except JWTError as e:
        print(f"DEBUG verify_token: JWTError occurred: {e}")
        raise credentials_exception


async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    """Get current authenticated user from token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = verify_token(token, credentials_exception)
    
    print(f"DEBUG get_current_user: Returning TokenData: email={token_data.email}, user_id={token_data.user_id}")
    
    return token_data