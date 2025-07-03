from VoicevoxEngine import VoicevoxClient


OUTPUTID = "003"
text = """
この論文は、大規模言語モデル（LLM）が新しい知識を継続的に学習し、人間のように記憶する能力を高めるための新しいフレームワーク「HippoRAG 2」を提案しています。現在のRAG（Retrieval-Augmented Generation：検索拡張生成）システムが持つ課題、特にベクトル検索に依存することによる人間の長期記憶のような動的で相互接続された性質を模倣できない点を克服しようとしています。
"""
speaker = 2


model = VoicevoxClient()
model.synthesize_voice(
    text=text,
    speaker=speaker,
    output_path=f"../../data/voices/{OUTPUTID}_{speaker}.wav"
)
