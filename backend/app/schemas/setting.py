from typing import Optional
from pydantic import BaseModel, Field

class SettingBase(BaseModel):
    company_name: str = Field(..., min_length=2, max_length=100, serialization_alias="companyName")
    default_country: str = Field(..., min_length=2, max_length=50, serialization_alias="defaultCountry")
    default_country_code: str = Field(..., min_length=1, max_length=10, serialization_alias="defaultCountryCode")
    timezone: str = Field(..., min_length=2, max_length=50, serialization_alias="timezone")
    default_sender_id: str = Field(..., min_length=2, max_length=50, serialization_alias="defaultSenderId")
    default_route: str = Field(..., min_length=2, max_length=50, serialization_alias="defaultRoute")
    sms_balance_warning_threshold: int = Field(..., ge=0, serialization_alias="smsBalanceWarningThreshold")

    # Gateway Configuration parameters
    sender_id: str = Field("CAFECHAI", serialization_alias="senderId")
    gateway: str = Field("MOCK", serialization_alias="gateway")
    api_key: Optional[str] = Field(None, serialization_alias="apiKey")
    api_secret: Optional[str] = Field(None, serialization_alias="apiSecret")

class SettingUpdate(BaseModel):
    company_name: Optional[str] = Field(None, min_length=2, max_length=100, validation_alias="companyName", serialization_alias="companyName")
    default_country: Optional[str] = Field(None, min_length=2, max_length=50, validation_alias="defaultCountry", serialization_alias="defaultCountry")
    default_country_code: Optional[str] = Field(None, min_length=1, max_length=10, validation_alias="defaultCountryCode", serialization_alias="defaultCountryCode")
    timezone: Optional[str] = Field(None, min_length=2, max_length=50, validation_alias="timezone", serialization_alias="timezone")
    default_sender_id: Optional[str] = Field(None, min_length=2, max_length=50, validation_alias="defaultSenderId", serialization_alias="defaultSenderId")
    default_route: Optional[str] = Field(None, min_length=2, max_length=50, validation_alias="defaultRoute", serialization_alias="defaultRoute")
    sms_balance_warning_threshold: Optional[int] = Field(None, ge=0, validation_alias="smsBalanceWarningThreshold", serialization_alias="smsBalanceWarningThreshold")
    
    sender_id: Optional[str] = Field(None, validation_alias="senderId", serialization_alias="senderId")
    gateway: Optional[str] = Field(None, validation_alias="gateway", serialization_alias="gateway")
    api_key: Optional[str] = Field(None, validation_alias="apiKey", serialization_alias="apiKey")
    api_secret: Optional[str] = Field(None, validation_alias="apiSecret", serialization_alias="apiSecret")

class SettingResponse(SettingBase):
    sms_balance: int = Field(50000, serialization_alias="smsBalance")

    class Config:
        from_attributes = True
        populate_by_name = True
