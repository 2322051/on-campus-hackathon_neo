import arxiv
import re
import math
from typing import List, Dict, Any

class PaperFetcher:
    """
    arXiv APIを介して論文情報を効率的に取得するクラス
    """
    def __init__(self):
        self.client = arxiv.Client(
            page_size=200,
            delay_seconds=3.0,
            num_retries=3
        )
        # Computer Scienceの全サブカテゴリリスト
        self.cs_categories = [
            "cs.AI", "cs.AR", "cs.CC", "cs.CE", "cs.CG", "cs.CL", "cs.CR", "cs.CV", 
            "cs.CY", "cs.DB", "cs.DC", "cs.DL", "cs.DM", "cs.DS", "cs.ET", "cs.FL", 
            "cs.GL", "cs.GR", "cs.GT", "cs.HC", "cs.IR", "cs.IT", "cs.LG", "cs.LO", 
            "cs.MA", "cs.MM", "cs.MS", "cs.NA", "cs.NE", "cs.NI", "cs.OH", "cs.OS", 
            "cs.PF", "cs.PL", "cs.RO", "cs.SC", "cs.SD", "cs.SE", "cs.SI", "cs.SY"
        ]

    def _format_authors(self, authors: List[arxiv.Result.Author]) -> str:
        if not authors:
            return ""
        first_author = authors[0].name
        return f"{first_author} et al." if len(authors) > 1 else first_author

    def _clean_abstract(self, abstract: str) -> str:
        return re.sub(r'\s+', ' ', abstract).strip()

    def fetch_papers(self, total_papers: int) -> List[Dict[str, Any]]:
        """
        CSの各サブカテゴリから論文を分散して取得し、合計で指定件数に到達させる
        """
        if total_papers <= 0:
            return []

        # 各カテゴリから取得する論文数を計算 (切り上げ)
        num_categories = len(self.cs_categories)
        papers_per_category = math.ceil(total_papers / num_categories)
        
        print(f"Computer Science分野全体から論文を約 {total_papers} 件取得します...")
        print(f"({num_categories}カテゴリ x 各約{papers_per_category}件)")

        all_papers = []
        collected_ids = set() # 取得済み論文IDを管理し、重複を防ぐ

        for category in self.cs_categories:
            if len(all_papers) >= total_papers:
                break # 目標件数に達したらループを抜ける

            print(f"\nカテゴリ '{category}' から論文を取得中...")
            
            try:
                search = arxiv.Search(
                    query=f"cat:{category}",
                    max_results=papers_per_category,
                    sort_by=arxiv.SortCriterion.SubmittedDate
                )
                
                results = self.client.results(search)
                
                count_in_cat = 0
                for result in results:
                    paper_id = result.get_short_id()
                    if paper_id not in collected_ids:
                        paper_data = {
                            "paper_id": paper_id,
                            "title": result.title,
                            "author": self._format_authors(result.authors),
                            "published_date": result.published.strftime('%Y-%m-%d'),
                            "arxiv_url": result.entry_id,
                            "arxiv_category": result.primary_category,
                            "abstract": self._clean_abstract(result.summary)
                        }
                        all_papers.append(paper_data)
                        collected_ids.add(paper_id)
                        count_in_cat += 1
                        
                        # 全体の進捗表示
                        print(f"  論文取得中... (合計: {len(all_papers)}/{total_papers})", end='\r')

                    if len(all_papers) >= total_papers:
                        break # 目標件数に達したら内部ループも抜ける
                
                if count_in_cat == 0:
                    print(f"  カテゴリ '{category}' からは新しい論文を取得できませんでした。")

            except Exception as e:
                print(f"\nカテゴリ '{category}' の取得中にエラーが発生しました: {e}")
                continue # エラーが発生しても次のカテゴリへ

        print(f"\n\n論文の取得が完了しました。合計: {len(all_papers)}件")
        return all_papers
