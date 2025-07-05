"""
backend/modules/arxiv.py

This module provides a client for accessing the arXiv API using the Python 'arxiv' library.
It defines the ArxivClient class, which can perform searches for papers based on a query.
The retrieved information includes title, authors, summary, publication date, and URL.
"""

import arxiv
import re
import random # ★★★ ランダム選択のためにインポート ★★★
from typing import Optional, Dict, Any, List

class PaperGetter:
    """
    arXiv APIを介して論文情報を取得し、辞書として返すクラス
    """
    def __init__(self, max_results: int = 1):
        self.client = arxiv.Client()
        self.max_results = max_results
        # ★★★ ランダム検索用のカテゴリリストを定義 ★★★
        self.random_categories = [
            "cs.AI", "cs.LG", "cs.CV", "cs.CL", "cs.RO", 
            "math.ST", "stat.ML", "physics.data-an",
            "q-bio.NC", "econ.EM"
        ]

    def _format_authors(self, author_list: List[arxiv.Result.Author]) -> str:
        """
        著者リストを整形するプライベートメソッド
        """
        if not author_list:
            return ""
        
        first_author_name = author_list[0].name
        
        if len(author_list) > 1:
            return f"{first_author_name} et al."
        else:
            return first_author_name

    def fetch_by_keyword(self, keyword: str) -> Optional[Dict[str, Any]]:
        """
        指定されたキーワードで論文を検索し、辞書オブジェクトとして返す
        """
        query = ""
        
        if keyword.strip():
            # キーワードがある場合
            individual_keywords = keyword.replace(",", " ").split()
            query = f"({' AND '.join([f'all:{kw}' for kw in individual_keywords])})"
            print(f"arXivで検索中... クエリ: '{query}'")
        else:
            # ★★★ キーワードがない場合、ランダムなカテゴリから検索 ★★★
            random_category = random.choice(self.random_categories)
            query = f"cat:{random_category}"
            print(f"キーワードが指定されていないため、ランダムなカテゴリ({random_category})から最新の論文を検索します...")

        try:
            search = arxiv.Search(
                query=query,
                max_results=self.max_results,
                # Note: SubmittedDateの方が新しい論文を見つけやすい
                sort_by=arxiv.SortCriterion.SubmittedDate 
            )
            
            results = list(self.client.results(search))

            if not results:
                print("条件に合う論文が見つかりませんでした。")
                return None
            
            target_paper = results[0]

            # 整形された著者名(文字列)を取得
            formatted_authors = self._format_authors(target_paper.authors)

            # Abstractの不要な改行や空白を整形
            raw_abstract = target_paper.summary
            cleaned_abstract = re.sub(r'\s+', ' ', raw_abstract).strip()

            paper_data = {
                "title": target_paper.title,
                "authors": formatted_authors,
                "primary_category": target_paper.primary_category,
                "published_date": target_paper.published.strftime('%Y-%m-%d'),
                "url": target_paper.entry_id,
                "abstract_original": cleaned_abstract
            }
            return paper_data

        except Exception as e:
            print(f"arXivからの論文取得中にエラーが発生しました: {e}")
            return None
