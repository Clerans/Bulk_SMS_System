"""
Authoritative SMS Segmentation & Encoding Service for Dialog eSMS and other SMS Gateways.

Implements official 3GPP TS 23.038 / GSM 03.38 character encoding standards:
- GSM-7 Basic Character Set (1 septet per character)
- GSM-7 Extension Character Set (2 septets per character: | ^ € { } [ ] ~ \)
- Unicode / UCS-2 Encoding for Sinhala, Tamil, emojis, and extended scripts
- Multi-part / Concatenated SMS segmentation (User Data Header takes 6-7 bytes):
    * GSM-7: 160 chars for 1 segment; 153 chars/segment for multipart (>=2 segments)
    * Unicode: 70 chars for 1 segment; 67 chars/segment for multipart (>=2 segments)
"""

import math
from typing import Dict, List, Set, Tuple

# GSM 03.38 Basic Character Set
GSM7_BASIC_CHARS: Set[str] = set(
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)

# GSM 03.38 Extension Table Characters (escaped by 0x1B, counting as 2 character units / septets)
GSM7_EXTENSION_CHARS: Set[str] = set("|^€{}[binary]~\\".replace("binary", ""))
GSM7_EXT_LIST: Set[str] = {"|", "^", "€", "{", "}", "[", "]", "~", "\\"}


class SMSSegmentService:
    """
    Authoritative backend SMS character segment and unit calculator.
    Guarantees accurate SMS balance deduction and prevents overspending.
    """

    @classmethod
    def detect_encoding(cls, message: str) -> str:
        """
        Detects whether a message qualifies as GSM-7 or requires Unicode (UCS-2).
        Returns: 'GSM-7' or 'Unicode'.
        """
        if not message:
            return "GSM-7"

        for char in message:
            if char not in GSM7_BASIC_CHARS and char not in GSM7_EXT_LIST:
                return "Unicode"

        return "GSM-7"

    @classmethod
    def calculate_segments(cls, message: str) -> Dict[str, any]:
        """
        Calculates character count, encoding type, segment count, and remaining characters in the current segment.
        """
        if not message:
            return {
                "encoding": "GSM-7",
                "character_count": 0,
                "segment_count": 0,
                "characters_per_segment": 160,
                "remaining_characters": 160,
            }

        encoding = cls.detect_encoding(message)

        if encoding == "GSM-7":
            # Extension characters take 2 septets
            char_count = sum(2 if char in GSM7_EXT_LIST else 1 for char in message)
            single_limit = 160
            multi_limit = 153
        else:
            # Unicode: Each code point (or surrogate) is counted
            char_count = len(message)
            single_limit = 70
            multi_limit = 67

        if char_count == 0:
            segment_count = 0
            remaining = single_limit
            chars_per_seg = single_limit
        elif char_count <= single_limit:
            segment_count = 1
            remaining = single_limit - char_count
            chars_per_seg = single_limit
        else:
            segment_count = math.ceil(char_count / multi_limit)
            total_capacity = segment_count * multi_limit
            remaining = total_capacity - char_count
            chars_per_seg = multi_limit

        return {
            "encoding": encoding,
            "character_count": char_count,
            "segment_count": segment_count,
            "characters_per_segment": chars_per_seg,
            "remaining_characters": remaining,
        }

    @classmethod
    def calculate_campaign_sms_units(cls, message: str, recipient_count: int) -> Tuple[int, int, str]:
        """
        Calculates total required SMS units for a campaign.
        Returns: (total_sms_units, segments_per_recipient, encoding)
        """
        if recipient_count <= 0 or not message:
            return 0, 0, "GSM-7"

        metrics = cls.calculate_segments(message)
        segments_per_recipient = max(1, metrics["segment_count"])
        total_units = recipient_count * segments_per_recipient
        return total_units, segments_per_recipient, metrics["encoding"]


sms_segment_service = SMSSegmentService()
