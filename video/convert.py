from moviepy import VideoFileClip

def convert_avi_to_mp4(input_file: str, output_file: str):
    try:
        clip = VideoFileClip(input_file)
        clip.write_videofile(output_file, codec="libx264", audio_codec="aac")
        print(f"Conversion yay {output_file}")
    except Exception as e:
        print(e)

convert_avi_to_mp4("./output.avi", "work")