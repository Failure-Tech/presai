
import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Tuple
import warnings

warnings.filterwarnings('ignore')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class BodycamProcessor:
    
    def __init__(self, hf_token: str = None):
        self.hf_token = hf_token
        self.whisper_model = None
        self.diarization_pipeline = None
        
    def step1_convert_mp4_to_wav(self, mp4_path: str) -> str:
        logger.info("=" * 60)
        logger.info("STEP 1: Converting MP4 to WAV")
        logger.info("=" * 60)
        
        try:
            from moviepy import VideoFileClip
        except ImportError:
            try:
                from moviepy.editor import VideoFileClip
            except ImportError:
                raise ImportError("moviepy not installed. Run: pip install moviepy")
        
        mp4_path = Path(mp4_path)
        if not mp4_path.exists():
            raise FileNotFoundError(f"MP4 file not found: {mp4_path}")
        
        wav_path = mp4_path.with_suffix('.wav')
        
        logger.info(f"Input: {mp4_path}")
        logger.info(f"Output: {wav_path}")
        
        logger.info("Extracting audio...")
        video = VideoFileClip(str(mp4_path))
        video.audio.write_audiofile(
            str(wav_path),
            codec='pcm_s16le',
            fps=16000
        )
        video.close()
        
        logger.info(f"✓ WAV file created: {wav_path}")
        return str(wav_path)
    
    def step2_transcribe_audio(self, wav_path: str) -> Tuple[str, List[Dict]]:
        logger.info("=" * 60)
        logger.info("STEP 2: Transcribing Audio with Whisper")
        logger.info("=" * 60)
        
        try:
            import torch
            from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
            import librosa
        except ImportError as e:
            if "librosa" in str(e):
                raise ImportError(
                    "librosa not installed. Run: pip install librosa soundfile"
                )
            raise ImportError(
                "transformers/torch not installed. Run: "
                "pip install torch transformers accelerate"
            )
        
        wav_path = Path(wav_path)
        
        if self.whisper_model is None:
            logger.info("Loading Whisper model (openai/whisper-mediu-v3)...")
            
            device = "cuda:0" if torch.cuda.is_available() else "cpu"
            torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
            
            model_id = "openai/whisper-medium"
            
            model = AutoModelForSpeechSeq2Seq.from_pretrained(
                model_id,
                torch_dtype=torch_dtype,
                low_cpu_mem_usage=True,
                use_safetensors=True
            )
            model.to(device)
            
            processor = AutoProcessor.from_pretrained(model_id)
            
            self.whisper_model = pipeline(
                "automatic-speech-recognition",
                model=model,
                tokenizer=processor.tokenizer,
                feature_extractor=processor.feature_extractor,
                max_new_tokens=128,
                chunk_length_s=30,
                batch_size=16,
                return_timestamps=True,
                torch_dtype=torch_dtype,
                device=device,
            )
            
            logger.info(f"✓ Whisper model loaded on {device}")
        
        logger.info("Loading audio file into memory (avoiding TorchCodec on Windows)...")
        audio_array, sample_rate = librosa.load(str(wav_path), sr=16000)
        logger.info(f"✓ Audio loaded: {len(audio_array)/sample_rate:.2f} seconds")
        
        logger.info("Transcribing audio (this may take several minutes)...")
        result = self.whisper_model(audio_array)
        
        segments = []
        if 'chunks' in result:
            for chunk in result['chunks']:
                segments.append({
                    'start': chunk['timestamp'][0],
                    'end': chunk['timestamp'][1],
                    'text': chunk['text'].strip()
                })
        else:
            segments.append({
                'start': 0.0,
                'end': 0.0,
                'text': result['text'].strip()
            })
        
        transcript_path = wav_path.parent / "session_transcript_raw.txt"
        with open(transcript_path, 'w', encoding='utf-8') as f:
            f.write("RAW TRANSCRIPT WITH TIMESTAMPS\n")
            f.write("=" * 60 + "\n\n")
            for seg in segments:
                f.write(f"[{seg['start']:.2f} - {seg['end']:.2f}] {seg['text']}\n")
        
        logger.info(f"✓ Raw transcript saved: {transcript_path}")
        logger.info(f"✓ Transcribed {len(segments)} segments")
        
        return str(transcript_path), segments
    
    def step3_diarize_speakers(self, wav_path: str) -> Tuple[object, Dict[str, str]]:
        logger.info("=" * 60)
        logger.info("STEP 3: Speaker Diarization")
        logger.info("=" * 60)
        
        if not self.hf_token:
            logger.warning("No Hugging Face token provided. Diarization will be skipped.")
            logger.warning("To use diarization, provide a token with access to pyannote models.")
            return None, {}
        
        try:
            from pyannote.audio import Pipeline
        except ImportError:
            raise ImportError("pyannote.audio not installed. Run: pip install pyannote.audio")
        
        if self.diarization_pipeline is None:
            logger.info("Loading pyannote diarization pipeline...")
            self.diarization_pipeline = Pipeline.from_pretrained(
                "pyannote/speaker-diarization-3.1",
                use_auth_token=self.hf_token
            )
            logger.info("✓ Diarization pipeline loaded")
        
        logger.info("Analyzing speakers (this may take several minutes)...")
        diarization = self.diarization_pipeline(wav_path)
        
        speaker_durations = {}
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            duration = turn.end - turn.start
            speaker_durations[speaker] = speaker_durations.get(speaker, 0) + duration
        
        logger.info(f"✓ Detected {len(speaker_durations)} speakers")
        
        speaker_mapping = {}
        if len(speaker_durations) == 0:
            logger.warning("No speakers detected")
        elif len(speaker_durations) == 1:
            speaker = list(speaker_durations.keys())[0]
            speaker_mapping[speaker] = "OFFICER"
            logger.info(f"  {speaker} → OFFICER (only speaker)")
        else:
            sorted_speakers = sorted(
                speaker_durations.items(),
                key=lambda x: x[1],
                reverse=True
            )
            speaker_mapping[sorted_speakers[0][0]] = "OFFICER"
            speaker_mapping[sorted_speakers[1][0]] = "SUBJECT_1"
            
            logger.info(f"  {sorted_speakers[0][0]} → OFFICER ({sorted_speakers[0][1]:.1f}s)")
            logger.info(f"  {sorted_speakers[1][0]} → SUBJECT_1 ({sorted_speakers[1][1]:.1f}s)")
            
            for i, (speaker, duration) in enumerate(sorted_speakers[2:], start=2):
                speaker_mapping[speaker] = f"SUBJECT_{i}"
                logger.info(f"  {speaker} → SUBJECT_{i} ({duration:.1f}s)")
        
        return diarization, speaker_mapping
    
    def step4_align_transcript(
        self,
        segments: List[Dict],
        diarization: object,
        speaker_mapping: Dict[str, str],
        output_dir: Path
    ) -> Tuple[str, str]:
        logger.info("=" * 60)
        logger.info("STEP 4: Aligning Transcript with Speakers")
        logger.info("=" * 60)
        
        labeled_segments = []
        
        for seg in segments:
            start_time = seg['start']
            end_time = seg['end']
            text = seg['text']
            
            speaker_label = "UNKNOWN"
            
            if diarization is not None and speaker_mapping:
                max_overlap = 0
                best_speaker = None
                
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    overlap_start = max(start_time, turn.start)
                    overlap_end = min(end_time, turn.end)
                    overlap = max(0, overlap_end - overlap_start)
                    
                    if overlap > max_overlap:
                        max_overlap = overlap
                        best_speaker = speaker
                
                if best_speaker and best_speaker in speaker_mapping:
                    speaker_label = speaker_mapping[best_speaker]
            
            labeled_segments.append({
                'start': start_time,
                'end': end_time,
                'speaker': speaker_label,
                'text': text
            })
        
        txt_path = output_dir / "labeled_transcript.txt"
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write("LABELED TRANSCRIPT\n")
            f.write("=" * 60 + "\n\n")
            for seg in labeled_segments:
                f.write(f"[{seg['start']:.2f}-{seg['end']:.2f}] {seg['speaker']}: {seg['text']}\n")
        
        json_path = output_dir / "labeled_transcript.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(labeled_segments, f, indent=2)
        
        logger.info(f"✓ Labeled transcript (TXT): {txt_path}")
        logger.info(f"✓ Labeled transcript (JSON): {json_path}")
        logger.info(f"✓ Processed {len(labeled_segments)} segments")
        
        return str(txt_path), str(json_path)
    
    def process_bodycam_footage(self, mp4_path: str) -> Dict[str, str]:
        logger.info("\n" + "=" * 60)
        logger.info("BODY-WORN CAMERA AUDIO PROCESSING PIPELINE")
        logger.info("=" * 60 + "\n")
        
        output_files = {}
        
        try:
            wav_path = self.step1_convert_mp4_to_wav(mp4_path)
            output_files['wav'] = wav_path
            
            raw_transcript_path, segments = self.step2_transcribe_audio(wav_path)
            output_files['raw_transcript'] = raw_transcript_path
            
            diarization, speaker_mapping = self.step3_diarize_speakers(wav_path)
            
            output_dir = Path(wav_path).parent
            txt_path, json_path = self.step4_align_transcript(
                segments,
                diarization,
                speaker_mapping,
                output_dir
            )
            output_files['labeled_txt'] = txt_path
            output_files['labeled_json'] = json_path
            
            logger.info("\n" + "=" * 60)
            logger.info("PROCESSING COMPLETE!")
            logger.info("=" * 60)
            logger.info("\nOutput files:")
            for key, path in output_files.items():
                logger.info(f"  {key}: {path}")
            
            return output_files
            
        except Exception as e:
            logger.error(f"Error during processing: {str(e)}", exc_info=True)
            raise


def main():
    
    MP4_FILE = "body_worn_camera_example_footage.mp4"
    HF_TOKEN = None
    
    if not HF_TOKEN:
        HF_TOKEN = os.getenv("HF_TOKEN")
    
    processor = BodycamProcessor(hf_token=HF_TOKEN)
    
    try:
        output_files = processor.process_bodycam_footage(MP4_FILE)
        
        print("\n" + "=" * 60)
        print("SUCCESS! All files generated:")
        print("=" * 60)
        for key, path in output_files.items():
            print(f"{key}: {path}")
            
    except FileNotFoundError as e:
        print(f"\nError: {e}")
        print("\nMake sure 'body_worn_camera_example_footage.mp4' is in the current directory")
        
    except ImportError as e:
        print(f"\nError: {e}")
        print("\nPlease install required packages:")
        print("pip install moviepy torch transformers pyannote.audio accelerate")
        
    except Exception as e:
        print(f"\nError: {e}")
        print("\nCheck the logs above for details")


if __name__ == "__main__":
    main()
