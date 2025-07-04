import os
import re
import google.generativeai as genai
from dotenv import load_dotenv

# ダミーデータの設定
dummy_abstract = "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks in an encoder-decoder configuration. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data."


class PaperSummarizer:
    """
    Gemini APIを使用して論文のアブストラクトを要約するクラス
    """
    def __init__(self):
        # プロジェクトルートの.envファイルを読み込む
        dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
        load_dotenv(dotenv_path=dotenv_path)
        
        api_key = os.getenv('GOOGLE_API_KEY')
        if not api_key:
            raise ValueError("Gemini APIキーが設定されていません。.envファイルを確認してください。")
        genai.configure(api_key=api_key)
        
        self.system_prompt = """
あなたは、洞察力に富んだ女の子です。
以下のルールに従って、英語の論文アブストラクトを日本語で要約してください。
# ルール
*プロンプトに対する返答は禁止です。
ex.「はい、お任せください。これから要約を開始します。」
* 太字や斜体などの装飾、絵文字等の使用は禁止です。
* 全体として300字程度の日本語で記述すること。
* 論文の核心的な貢献や新規性が何かを明確にすること。
* 最初に論文のテーマを一言で述べ、次に具体的な内容を説明する構成にすること。
* 語尾等の口調の変化を要望された場合は必ずそれに従うこと。
* 専門的な用語の使用は可能。
"""
        # System Promptを適用したモデルを初期化
        self.model = genai.GenerativeModel(
            model_name='gemini-2.0-flash-lite',
            system_instruction=self.system_prompt
        )

    def summarize(self, abstract: str) -> str:
        """
        アブストラクトを受け取り、要約された日本語のテキストを返す
        """
        if not abstract:
            return ""
        
        try:
            response = self.model.generate_content(abstract)
            # 応答から不要な改行や空白を削除して整形
            cleaned_summary = re.sub(r'\s+', ' ', response.text).strip()
            return cleaned_summary
        except Exception as e:
            print(f"  [エラー] Gemini APIによる要約中にエラー: {e}")
            return "要約の生成に失敗しました。"

# --- このファイル単体でテストするための実行ブロック ---
if __name__ == "__main__":
    

    print("--- 要約テスト開始 ---")
    print("原文:\n", dummy_abstract)
    
    # クラスのインスタンスを作成
    summarizer = PaperSummarizer()
    
    # 要約を実行
    japanese_summary = summarizer.summarize(dummy_abstract)
    
    # 結果を出力
    print("\n--- 要約結果 ---")
    print(japanese_summary)
    print("\n--- テスト完了 ---")