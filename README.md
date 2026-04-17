# OCR Document Categorizer MVP

This MVP detects and crops a document from an image, extracts text with OCR, and categorizes text into:

- `title`
- `key_points`
- `body`
- `dates_numbers`
- `raw_text`

## Project Structure

- `backend/` Flask API + OpenCV + Tesseract OCR
- `frontend/` Next.js upload UI

## Prerequisites

1. Python 3.10+
2. Node.js 18+
3. Tesseract OCR installed on system

### Tesseract on Windows

- Install from [UB Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki)
- Optional: set `TESSERACT_CMD` env variable if binary is not in PATH, e.g.:
  - `C:\Program Files\Tesseract-OCR\tesseract.exe`

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Backend runs at `http://localhost:5000`.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## API Endpoint

`POST /process`

- Form data field: `file` (image file)

Response format:

```json
{
  "result": {
    "title": "...",
    "key_points": ["..."],
    "body": "...",
    "dates_numbers": ["..."],
    "raw_text": "..."
  }
}
```

## Notes

- Document detection uses contour-based detection and falls back to full image if no 4-point contour is found.
- Categorization is rule-based for MVP simplicity.
