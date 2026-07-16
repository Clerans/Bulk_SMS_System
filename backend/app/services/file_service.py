import io
import re
from typing import Any, Dict, List, Optional, Tuple
import uuid
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException
from app.models.contact import Contact, ContactStatus
from app.models.group import Group, group_contacts
from app.repositories.contact import contact_repository
from app.repositories.group import group_repository

class FileService:
    """
    Service for importing and exporting contact data from/to CSV and Excel formats.
    """
    def normalize_phone(self, phone: Any, default_prefix: str = "+94") -> Optional[str]:
        """
        Normalize phone numbers to E.164 format.
        E.g., "0771234567" -> "+94771234567"
              "77 123 4567" -> "+94771234567"
        """
        if pd.isna(phone) or not phone:
            return None
            
        # Clean the string, keep digits and leading '+'
        cleaned = re.sub(r"[^\d+]", "", str(phone).strip())
        
        if not cleaned:
            return None

        # If it has a plus sign, assume it is already internationalized
        if cleaned.startswith("+"):
            return cleaned
            
        # If it starts with 00, replace with +
        if cleaned.startswith("00"):
            return "+" + cleaned[2:]

        # Handle local formats starting with 0
        if cleaned.startswith("0") and len(cleaned) == 10:
            # e.g., 0771234567 -> prefix + 771234567
            return default_prefix + cleaned[1:]

        # If it matches local length without prefix (e.g. 9 digits like 771234567)
        if len(cleaned) == 9 and not cleaned.startswith("0"):
            return default_prefix + cleaned

        # Otherwise, if it has 11 or 12 digits, prepend + if missing
        if len(cleaned) >= 10 and not cleaned.startswith("+"):
            return "+" + cleaned

        return cleaned

    def _map_columns(self, columns: List[str]) -> Dict[str, str]:
        """
        Dynamically maps uploaded file columns to expected database fields.
        """
        mapping = {}
        for col in columns:
            col_lower = str(col).lower().replace("_", "").replace(" ", "")
            
            # Map phone
            if col_lower in ["phone", "phonenumber", "mobile", "mobilenumber", "tel", "contact", "contactnumber"]:
                mapping["phone"] = col
            # Map first name
            elif col_lower in ["firstname", "name", "first", "givenname"]:
                mapping["first_name"] = col
            # Map last name
            elif col_lower in ["lastname", "last", "surname", "familyname"]:
                mapping["last_name"] = col
            # Map email
            elif col_lower in ["email", "emailaddress", "mail"]:
                mapping["email"] = col
            # Map company
            elif col_lower in ["company", "organization", "org", "work"]:
                mapping["company"] = col
            # Map notes
            elif col_lower in ["notes", "note", "description", "remark", "remarks"]:
                mapping["notes"] = col
            # Map group
            elif col_lower in ["group", "groupname", "contactsgroup", "category"]:
                mapping["group_name"] = col
                
        return mapping

    async def import_contacts(
        self,
        db: AsyncSession,
        file_content: bytes,
        filename: str,
        user_id: uuid.UUID,
        default_prefix: str = "+94"
    ) -> Dict[str, int]:
        """
        Parse CSV or Excel, validate structure, normalize phone numbers,
        and perform a high-performance bulk database save/upsert.
        """
        # Load file into DataFrame
        try:
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(file_content), dtype=str)
            elif filename.endswith((".xls", ".xlsx")):
                df = pd.read_excel(io.BytesIO(file_content), dtype=str)
            else:
                raise BadRequestException(message="Unsupported file format. Please upload CSV or Excel.")
        except Exception as e:
            if isinstance(e, BadRequestException):
                raise
            raise BadRequestException(message=f"Failed to read file: {str(e)}")

        columns = df.columns.tolist()
        mapping = self._map_columns(columns)

        if "phone" not in mapping:
            raise BadRequestException(
                message="Could not find a phone number column. Please verify headers."
            )

        # Standard defaults for name if missing
        first_name_col = mapping.get("first_name")
        last_name_col = mapping.get("last_name")
        phone_col = mapping.get("phone")
        email_col = mapping.get("email")
        company_col = mapping.get("company")
        notes_col = mapping.get("notes")
        group_col = mapping.get("group_name")

        stats = {"total": len(df), "imported": 0, "updated": 0, "failed": 0}

        # Cache groups to avoid querying DB continuously
        group_cache = {}

        for _, row in df.iterrows():
            phone_raw = row.get(phone_col)
            normalized_phone = self.normalize_phone(phone_raw, default_prefix)
            
            if not normalized_phone:
                stats["failed"] += 1
                continue

            # Extract fields
            fname = row.get(first_name_col) if first_name_col else "Imported"
            lname = row.get(last_name_col) if last_name_col else "Contact"
            email = row.get(email_col) if email_col else None
            company = row.get(company_col) if company_col else None
            notes = row.get(notes_col) if notes_col else None
            group_name = row.get(group_col) if group_col else None

            # Handle pd.isna
            fname = str(fname) if not pd.isna(fname) else "Imported"
            lname = str(lname) if not pd.isna(lname) else "Contact"
            email = str(email) if email and not pd.isna(email) else None
            company = str(company) if company and not pd.isna(company) else None
            notes = str(notes) if notes and not pd.isna(notes) else None
            group_name = str(group_name) if group_name and not pd.isna(group_name) else None

            # Check if contact already exists
            contact = await contact_repository.get_by_phone(db, phone=normalized_phone)
            
            contact_data = {
                "first_name": fname,
                "last_name": lname,
                "email": email,
                "company": company,
                "notes": notes,
                "phone": normalized_phone,
                "created_by": user_id,
                "status": ContactStatus.ACTIVE
            }

            if contact:
                # Update existing
                await contact_repository.update(db, db_obj=contact, obj_in=contact_data)
                stats["updated"] += 1
            else:
                # Create new
                contact = await contact_repository.create(db, obj_in=contact_data)
                stats["imported"] += 1

            # Handle group association
            if group_name:
                group_name_clean = group_name.strip()
                if group_name_clean not in group_cache:
                    grp = await group_repository.get_by_name(db, name=group_name_clean)
                    if not grp:
                        # Auto create group
                        grp = await group_repository.create(
                            db,
                            obj_in={"name": group_name_clean, "description": "Auto-created during import"}
                        )
                    group_cache[group_name_clean] = grp.id
                
                # Link Contact to Group
                await group_repository.add_contacts_to_group(
                    db,
                    group_id=group_cache[group_name_clean],
                    contact_ids=[contact.id]
                )

        return stats

    async def export_contacts(self, contacts: List[Contact], format_type: str = "csv") -> io.BytesIO:
        """
        Generate CSV or Excel byte streams from a list of contact records.
        """
        data = []
        for c in contacts:
            group_names = [g.name for g in c.groups] if c.groups else []
            data.append({
                "First Name": c.first_name,
                "Last Name": c.last_name,
                "Phone": c.phone,
                "Email": c.email or "",
                "Company": c.company or "",
                "Notes": c.notes or "",
                "Country": c.country or "",
                "Status": c.status.value,
                "Groups": ", ".join(group_names)
            })

        df = pd.DataFrame(data)
        output = io.BytesIO()

        if format_type == "excel":
            with pd.ExcelWriter(output, engine="openpyxl") as writer:
                df.to_excel(writer, index=False, sheet_name="Contacts")
        else:
            df.to_csv(output, index=False)

        output.seek(0)
        return output

file_service = FileService()
