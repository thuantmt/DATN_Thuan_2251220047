import argparse
from pathlib import Path

import fitz
import win32com.client


def render(input_path: Path, output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = output_dir / f"{input_path.stem}.pdf"
    word = win32com.client.DispatchEx("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0
    document = None
    try:
        document = word.Documents.Open(str(input_path.resolve()), ReadOnly=True)
        document.ExportAsFixedFormat(str(pdf_path.resolve()), 17)
    finally:
        if document is not None:
            document.Close(False)
        word.Quit()

    pdf = fitz.open(pdf_path)
    try:
        for index, page in enumerate(pdf):
            image = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
            image.save(output_dir / f"page-{index + 1}.png")
    finally:
        pdf.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output_dir", type=Path)
    arguments = parser.parse_args()
    render(arguments.input, arguments.output_dir)
