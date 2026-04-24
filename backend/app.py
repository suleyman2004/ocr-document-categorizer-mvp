import os
import re
from typing import Dict, List

import cv2
import numpy as np
import pytesseract
from flask import Flask, jsonify, request
from flask_cors import CORS


if os.name == "nt":  # Windows
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

app = Flask(__name__)
CORS(app)


def order_points(points: np.ndarray) -> np.ndarray:
    rect = np.zeros((4, 2), dtype="float32")
    s = points.sum(axis=1)
    diff = np.diff(points, axis=1)

    rect[0] = points[np.argmin(s)]
    rect[2] = points[np.argmax(s)]
    rect[1] = points[np.argmin(diff)]
    rect[3] = points[np.argmax(diff)]
    return rect


def four_point_transform(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    rect = order_points(points)
    (tl, tr, br, bl) = rect

    width_a = np.linalg.norm(br - bl)
    width_b = np.linalg.norm(tr - tl)
    max_width = max(int(width_a), int(width_b))

    height_a = np.linalg.norm(tr - br)
    height_b = np.linalg.norm(tl - bl)
    max_height = max(int(height_a), int(height_b))

    destination = np.array(
        [
            [0, 0],
            [max_width - 1, 0],
            [max_width - 1, max_height - 1],
            [0, max_height - 1],
        ],
        dtype="float32",
    )

    transform_matrix = cv2.getPerspectiveTransform(rect, destination)
    return cv2.warpPerspective(image, transform_matrix, (max_width, max_height))


def detect_and_crop_document(image: np.ndarray) -> np.ndarray:
    ratio = image.shape[0] / 500.0
    resized = cv2.resize(image, (int(image.shape[1] / ratio), 500))
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)
    edged = cv2.Canny(blurred, 75, 200)

    contours, _ = cv2.findContours(edged, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    document_contour = None
    for contour in contours:
        perimeter = cv2.arcLength(contour, True)
        approx = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(approx) == 4:
            document_contour = approx
            break

    if document_contour is not None:
        warped = four_point_transform(image, document_contour.reshape(4, 2) * ratio)
        return warped

    return image


def clean_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    normalized_lines = [re.sub(r"\s+", " ", line) for line in lines]
    return "\n".join(normalized_lines).strip()


def categorize_text(text: str) -> Dict[str, object]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    title = lines[0] if lines else ""

    key_points: List[str] = []
    body_lines: List[str] = []
    dates_numbers: List[str] = []

    bullet_pattern = re.compile(r"^(\-|\*|•|\d+[\.\)])\s+")
    date_number_pattern = re.compile(
        r"(\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b|\b\d{4}\b|\b\d+([.,]\d+)?\b)"
    )

    for index, line in enumerate(lines):
        if index == 0:
            continue

        if bullet_pattern.search(line):
            key_points.append(bullet_pattern.sub("", line).strip())
        else:
            body_lines.append(line)

        matches = date_number_pattern.findall(line)
        if matches:
            dates_numbers.extend([match[0] for match in matches])

    return {
        "title": title,
        "key_points": key_points,
        "body": " ".join(body_lines).strip(),
        "dates_numbers": sorted(list(set(dates_numbers))),
        "raw_text": text,
    }


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


@app.route("/process", methods=["POST"])
def process_document():
    if "file" not in request.files:
        return jsonify({"error": "Missing file field in request."}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    file_bytes = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

    if image is None:
        return jsonify({"error": "Invalid image file."}), 400

    if os.getenv("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD")

    cropped = detect_and_crop_document(image)
    grayscale = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    thresholded = cv2.threshold(grayscale, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]

    raw_text = pytesseract.image_to_string(thresholded)
    cleaned_text = clean_text(raw_text)
    categorized = categorize_text(cleaned_text)

    _, image_buffer = cv2.imencode(".png", cropped)
    cropped_base64 = image_buffer.tobytes().hex()

    return jsonify(
        {
            "cropped_image_hex": cropped_base64,
            "result": categorized,
        }
    )

@app.route("/reprocess", methods=["POST"])
def reprocess_text():
    data = request.get_json()

    if not data or "text" not in data:
        return jsonify({"error": "No text provided"}), 400

    text = data["text"]

    cleaned_text = clean_text(text)
    categorized = categorize_text(cleaned_text)

    return jsonify({
        "result": categorized
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
