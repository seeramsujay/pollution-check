import json
from pathlib import Path

def test_package_json():
    pkg_path = Path("package.json")
    assert pkg_path.exists()
    data = json.loads(pkg_path.read_text())
    assert "name" in data
    assert "scripts" in data
    assert "test" in data["scripts"]

def test_carbon_emissions_constants():
    const_path = Path("src/constants/carbonEmissions.ts")
    assert const_path.exists()
    content = const_path.read_text()
    assert "VISION_CARBON_DICT" in content
    assert "FINANCIAL_CARBON_DICT" in content or "beef" in content

def test_csv_parser_file():
    csv_parser = Path("src/utils/csvParser.ts")
    assert csv_parser.exists()
    text = csv_parser.read_text()
    assert "parse" in text.lower()
    assert "date" in text
    assert "amount" in text
