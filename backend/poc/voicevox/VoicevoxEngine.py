import requests
from typing import Optional

AUDIO_QUERY_API = 'http://localhost:50021/audio_query'
SYNTHESIS_API = 'http://localhost:50021/synthesis'

class VoicevoxClient:
    """VoicevoxClient. convert text to voice by voicevoxapi"""

    def synthesize_voice(
        self,
        text: str,
        speaker: int,
    ) -> Optional[bytes]:
        """Create voice and return it as bytes.

        Args:
            text (str): The text of speak on voicevox engine.
            speaker (int): ID of speaker in voicevox engine.
        Returns:
            Optional[bytes]: The synthesized voice data as bytes, or None if failed.
        """
        # 1. テキストから音声合成のためのクエリを作成
        query_payload: dict[str, str | int] = {
            'text': text,
            'speaker': speaker
        }

        try:
            query_response = requests.post(
                AUDIO_QUERY_API,
                params=query_payload,
                timeout=10
            )
            query_response.raise_for_status() # ステータスコードが200番台でない場合に例外を発生
            query = query_response.json()

            # 2. クエリを元に音声データを生成
            synthesis_payload = {'speaker': speaker}
            synthesis_response = requests.post(
                SYNTHESIS_API,
                params=synthesis_payload, 
                json=query,
                timeout=30
            )
            synthesis_response.raise_for_status()

            print(f"Successfully synthesized voice for text: '{text[:20]}...'")
            return synthesis_response.content

        except requests.exceptions.RequestException as e:
            print(f"Error communicating with VOICEVOX engine: {e}")
            return None
        except Exception as e:
            print(f"An unexpected error occurred in synthesize_voice: {e}")
            return None
