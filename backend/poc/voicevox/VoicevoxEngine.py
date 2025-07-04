import requests


AUDIO_QUERY_API = 'http://localhost:50021/audio_query'
SYNTHESIS_API = 'http://localhost:50021/synthesis'

class VoicevoxClient:
    """VoicevoxClient. convert text to voice by voicevoxapi"""

    def synthesize_voice(
        self,
        text: str,
        speaker: int,
        # speed_scale: float, # 話速の調整
        # pitch_scale: float, # ピッチ（全体の高さ）の調整
        # intonation_scale: float, # 抑揚の調整
        # pause_length: float, #
        # pre_phoneme_length: float, # 音声開始前の無音区間の長さ
        # post_phoneme_length: float, # 音声終了後の無音区間の長さ
        output_path: str="../output/"
    ):
        """create voice and output for output_path.

        Args:
            text (str): The text of speak on voicevox engine.
            speaker (int): ID of speaker in voicevox engine.Args:
            output_path (str, optional): The directory of output voice. Defaults to "../output/".
        """
        filename=f"{output_path}output.wav" # どこに保存するかを指定．ここら辺もしかしたら変わるかも．

        # 1. テキストから音声合成のためのクエリを作成
        # voicevoxapiは音声合成の前に，音声合成のためのqueryを発行するapiが存在する．
        query_payload: dict[str, str | int | float] = {
            'text': text,
            'speaker': speaker
        #     'speedScale': speed_scale,
        #     'pitchScale': pitch_scale,
        #     'intonationScale': intonation_scale,
        #     'pauseLength': pause_length,
        #     'prePhonemeLength': pre_phoneme_length,
        #     'postPhonemeLength': post_phoneme_length,
        }

        # Convert TypedDict to dict for params
        query_response = requests.post(
            AUDIO_QUERY_API,
            params=dict(query_payload)
        )

        if query_response.status_code != 200:
            print(f"Error in audio_query: {query_response.text}")
            return
        query = query_response.json()

        print(query)

        # 2. クエリを元に音声データを生成
        # 発行したqueryで音声合成する．
        synthesis_payload = {'speaker': speaker}
        synthesis_response = requests.post(
            SYNTHESIS_API,
            params=synthesis_payload, json=query
        )

        if synthesis_response.status_code == 200:
            # 音声ファイルとして保存
            with open(filename, 'wb') as f:
                f.write(synthesis_response.content)
            print(f"音声が {filename} に保存されました。")
        else:
            print(f"Error in synthesis: {synthesis_response.text}")
