"""
Unit tests for SMSSegmentService.
Validates GSM-7, Unicode, extension character weight, multipart segmentation, and unit calculations.
"""

import pytest
from app.services.sms_segment_service import sms_segment_service


def test_gsm7_basic_single_segment():
    text = "Hello World! This is a standard GSM 7-bit message."
    metrics = sms_segment_service.calculate_segments(text)
    assert metrics["encoding"] == "GSM-7"
    assert metrics["segment_count"] == 1
    assert metrics["character_count"] == len(text)
    assert metrics["characters_per_segment"] == 160
    assert metrics["remaining_characters"] == 160 - len(text)


def test_gsm7_extension_characters():
    # GSM extension chars: | ^ € { } [ ] ~ \ (each counts as 2 septets)
    text = "Price: 100 € [Discount] {Special}"
    # '€', '[', ']', '{', '}' are 5 extension chars -> 5 extra septets
    metrics = sms_segment_service.calculate_segments(text)
    assert metrics["encoding"] == "GSM-7"
    assert metrics["character_count"] == len(text) + 5
    assert metrics["segment_count"] == 1


def test_gsm7_multipart_segmentation():
    # 165 GSM characters -> 2 segments (153 chars per segment in multipart)
    text = "A" * 165
    metrics = sms_segment_service.calculate_segments(text)
    assert metrics["encoding"] == "GSM-7"
    assert metrics["segment_count"] == 2
    assert metrics["character_count"] == 165
    assert metrics["characters_per_segment"] == 153
    # Capacity = 2 * 153 = 306, remaining = 306 - 165 = 141
    assert metrics["remaining_characters"] == 141


def test_unicode_sinhala_segmentation():
    # Sinhala text: Unicode encoding (70 chars single, 67 chars/seg multipart)
    sinhala_text = "සුභ දවසක්! අපගේ විශේෂ වට්ටම් ලබාගන්න."
    metrics = sms_segment_service.calculate_segments(sinhala_text)
    assert metrics["encoding"] == "Unicode"
    assert metrics["segment_count"] == 1
    assert metrics["characters_per_segment"] == 70

    # Multi-segment unicode: 75 characters -> 2 segments
    long_sinhala = sinhala_text * 3
    long_metrics = sms_segment_service.calculate_segments(long_sinhala)
    assert long_metrics["encoding"] == "Unicode"
    assert long_metrics["segment_count"] == 2
    assert long_metrics["characters_per_segment"] == 67


def test_campaign_sms_units_calculation():
    # 1,000 recipients with a 3-segment message = 3,000 units
    three_segment_msg = "Hello Customer! " + ("Information details... " * 12)
    metrics = sms_segment_service.calculate_segments(three_segment_msg)
    assert metrics["segment_count"] >= 2

    total_units, seg_count, encoding = sms_segment_service.calculate_campaign_sms_units(
        message=three_segment_msg,
        recipient_count=1000
    )
    assert total_units == 1000 * seg_count
    assert seg_count == metrics["segment_count"]
