#!/usr/bin/env python3
"""
Combine bodycam_blur.mp4 with audio from body_worn_camera_example_footage.wav
and convert to h264 format.
"""

import subprocess
import os

# Define file paths
input_video = "frontend/public/bodycam_blur.mp4"
input_audio = "frontend/public/body_worn_camera_example_footage.wav"
output_video = "frontend/public/bodycam_blur_h264.mp4"

# Check if input files exist
if not os.path.exists(input_video):
    print(f"Error: {input_video} not found")
    exit(1)

if not os.path.exists(input_audio):
    print(f"Error: {input_audio} not found")
    exit(1)

# FFmpeg command to combine video and audio, and convert to h264
cmd = [
    'ffmpeg',
    '-i', input_video,           # Input video
    '-i', input_audio,           # Input audio
    '-c:v', 'libx264',          # H264 video codec
    '-c:a', 'aac',              # Audio codec (AAC is compatible with MP4)
    '-map', '0:v:0',            # Map video from first input
    '-map', '1:a:0',            # Map audio from second input
    '-shortest',                 # Stop when shortest input ends
    '-preset', 'medium',         # Compression preset (medium = balance)
    '-y',                        # Overwrite output file
    output_video
]

print("Starting video processing...")
print(f"Input video: {input_video}")
print(f"Input audio: {input_audio}")
print(f"Output video: {output_video}")
print(f"Running: {' '.join(cmd)}")
print()

try:
    result = subprocess.run(cmd, check=True)
    print(f"\nSuccess! Output file created: {output_video}")
except subprocess.CalledProcessError as e:
    print(f"Error during processing: {e}")
    exit(1)
except FileNotFoundError:
    print("Error: FFmpeg not found. Please install FFmpeg and ensure it's in PATH")
    exit(1)
