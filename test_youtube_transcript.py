#!/usr/bin/env python3
"""Quick test of YouTube transcript service (all methods: API, transcript_api, yt-dlp, AssemblyAI)."""
import sys
import os

# Allow using vendor-installed yt-dlp when present
vendor = os.path.join(os.path.dirname(__file__), 'vendor')
if os.path.isdir(vendor):
    sys.path.insert(0, vendor)

from services.video_extraction import (
    get_youtube_transcript,
    get_transcript_via_ytdlp,
    extract_video_id,
)

# User-provided test URL
TEST_URL = "https://youtu.be/eiC58R16hb8?si=-DZNW9MBoPuaW2gv"

def main():
    print("Testing YouTube transcript service...")
    print(f"  URL: {TEST_URL}")
    print(f"  Video ID: {extract_video_id(TEST_URL)}")
    print()

    # 1) Quick test: yt-dlp path only (no retries, fast)
    print("1) Direct yt-dlp caption test...")
    ytdlp_text = get_transcript_via_ytdlp(TEST_URL)
    if ytdlp_text and len(ytdlp_text.strip()) > 10:
        print(f"   [OK] yt-dlp returned {len(ytdlp_text)} chars")
        preview = (ytdlp_text[:180] + "...") if len(ytdlp_text) > 180 else ytdlp_text
        print(f"   Preview: {preview}")
    else:
        print("   [SKIP] yt-dlp returned nothing (video may have no subs or network issue)")

    # 2) Full pipeline (tries API, transcript_api, then yt-dlp, then AssemblyAI)
    print()
    print("2) Full get_youtube_transcript (all methods)...")
    result = get_youtube_transcript(TEST_URL)

    if result.get("success"):
        method = result.get("method", "?")
        transcript = result.get("transcript", "")
        preview = (transcript[:200] + "...") if len(transcript) > 200 else transcript
        print(f"   [OK] Method: {method}, length: {len(transcript)} chars")
        print(f"   Preview: {preview}")
    else:
        err = result.get("error", "Unknown error")
        print(f"   [FAIL] {err[:300]}")
    print()
    print("Done.")

if __name__ == "__main__":
    main()
