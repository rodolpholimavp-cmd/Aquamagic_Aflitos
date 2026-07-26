#!/usr/bin/env python3
import json
import re
import unicodedata
from datetime import datetime, time, date
from pathlib import Path

import openpyxl

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_EXCEL = Path(
    r"C:\Users\rodol\OneDrive\Área de Trabalho\Projeto Cursor\Projeto Lavanderia\Base_infos_lavanderia.xlsx"
)
OUTPUT = PROJECT_ROOT / "data" / "dashboard-data.json"

MACHINE_DE_PARA = {
    "11890 - secar - 02": "2 - SECAR - 02",
    "11890 - secar -": "2 - SECAR - 02",
    "3": "3 - LAVAR - 03",
    "11890": "2 - SECAR - 02",
    "4": "4 - SECAR - 04",
    "lavar - 01": "1 - LAVAR - 01",
    "secar - 02": "2 - SECAR - 02",
    "lavar - 03": "3 - LAVAR - 03",
    "lavar - 05": "5 - LAVAR - 05",
    "secar - 04": "4 - SECAR - 04",
    "secar - 06": "6 - SECAR - 06",
    "5": "5 - LAVAR - 05",
    "6": "6 - SECAR - 06",
    "1": "1 - LAVAR - 01",
    "19736 - 01": "2 - SECAR - 02",
    "19736 - 01 - seca": "2 - SECAR - 02",
    "ind": "2 - SECAR - 02",
    "4 - lavar - 03": "3 - LAVAR - 03",
}

SECAGEM_MACHINES = {
    "2 - secar - 02",
    "11890",
    "11890 - secar - 02",
    "11890 - secar -",
    "19736 - 01",
    "19736 - 01 - seca",
    "ind",
}


def normalize_text(value):
    text = str(value or "").strip().lower()
    text = unicodedata.normalize("NFD", text)
    return "".join(ch for ch in text if unicodedata.category(ch) != "Mn")


def format_standard_machine(number, action):
    machine_number = int(number)
    return f"{machine_number} - {action.upper()} - {machine_number:02d}"


def normalize_machine(value):
    text = str(value or "").strip()
    if not text:
        return "Não informado"

    mapped = MACHINE_DE_PARA.get(normalize_text(text))
    if mapped:
        return mapped

    match = re.match(r"^(\d+)\s*-\s*(LAVAR|SECAR)\s*-\s*(\d+)$", text, re.I)
    if match:
        return format_standard_machine(match.group(3), match.group(2))

    match = re.match(r"^(LAVAR|SECAR)\s*-\s*(\d+)$", text, re.I)
    if match:
        return format_standard_machine(match.group(2), match.group(1))

    if re.fullmatch(r"\d+", text):
        number = int(text)
        action = "SECAR" if number % 2 == 0 else "LAVAR"
        return format_standard_machine(number, action)

    return text


def resolve_cycle_type(product_value, machine):
    product = normalize_text(product_value)
    machine_norm = normalize_text(machine)

    if normalize_text(machine) in SECAGEM_MACHINES or "secar" in machine_norm:
        return "Secagem"
    if "lavar" in machine_norm:
        return "Lavagem"

    if product and product not in {"indefinido", "outros"}:
        if "lav" in product:
            return "Lavagem"
        if "sec" in product:
            return "Secagem"

    if not product or product in {"indefinido", "outros"}:
        match = re.match(r"^(\d+)", machine_norm)
        if match:
            number = int(match.group(1))
            return "Secagem" if number % 2 == 0 else "Lavagem"

    return "Outros"


def classify_shift(time_str):
    parts = [int(part) for part in time_str.split(":")]
    total = parts[0] * 3600 + parts[1] * 60 + (parts[2] if len(parts) > 2 else 0)
    if 5 * 3600 <= total <= 12 * 3600:
        return "01 - manhã"
    if 12 * 3600 + 1 <= total <= 18 * 3600:
        return "02 - tarde"
    if 18 * 3600 + 1 <= total <= 23 * 3600 + 59 * 60 + 59:
        return "03 - noite"
    return "04 - madrugada"


def normalize_payment(value):
    text = normalize_text(value)
    if not text or text in {"-", "na", "n/a", "null", "undefined"}:
        return "Fidelidade"
    if "pix" in text:
        return "PIX"
    if "cred" in text:
        return "Crédito"
    if "deb" in text:
        return "Débito"
    if "fidelidade" in text:
        return "Fidelidade"
    return str(value).strip()


def parse_amount(value):
    if isinstance(value, (int, float)):
        return round(float(value), 2)
    text = str(value or "").strip().replace("R$", "").replace(" ", "")
    if not text:
        return 0.0
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    try:
        return round(float(text), 2)
    except ValueError:
        return 0.0


def format_date(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    match = re.match(r"^(\d{1,2})/(\d{1,2})/(\d{2,4})", text)
    if match:
        day, month, year = match.groups()
        if len(year) == 2:
            year = f"20{year}"
        return f"{year}-{int(month):02d}-{int(day):02d}"
    if re.match(r"^\d{4}-\d{2}-\d{2}", text):
        return text[:10]
    return None


def format_time(value):
    if isinstance(value, datetime):
        value = value.time()
    if isinstance(value, time):
        return value.strftime("%H:%M:%S")
    text = str(value).strip()
    match = re.match(r"^(\d{1,2}):(\d{2})(?::(\d{2}))?$", text)
    if match:
        return f"{int(match.group(1)):02d}:{int(match.group(2)):02d}:{int(match.group(3) or 0):02d}"
    return "00:00:00"


def find_column(headers, aliases, preferred=None):
    normalized = {normalize_text(header): header for header in headers if header}
    for name in preferred or []:
        key = normalize_text(name)
        if key in normalized:
            return normalized[key]
    for alias in aliases:
        if alias in normalized:
            return normalized[alias]
    for alias in sorted(aliases, key=len, reverse=True):
        for norm, raw in normalized.items():
            if alias in norm:
                return raw
    return None


def export_excel(excel_path):
    workbook = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    sheet = workbook.active
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows)

    columns = {
        "date": find_column(headers, {"data", "date", "dia"}, ["Data", "DATA", "Date"]),
        "time": find_column(headers, {"hora", "horario", "time"}, ["Hora"]),
        "amount": find_column(headers, {"total venda", "totalvenda", "valor"}, ["Total Venda"]),
        "cycleType": find_column(headers, {"produtos", "produto", "ciclo"}, ["Produtos"]),
        "machine": find_column(headers, {"maquina", "equipamento"}, ["Máquina", "Maquina"]),
        "paymentMethod": find_column(headers, {"tipo cartao"}, ["Tipo Cartão", "Tipo Cartao"]),
        "user": find_column(headers, {"usuario", "user", "operador", "cliente"}, ["Usuário", "Usuario"]),
    }

    header_index = {header: idx for idx, header in enumerate(headers) if header}
    transactions = []

    for row in rows:
        if not row:
            continue
        date_value = row[header_index[columns["date"]]] if columns["date"] else None
        parsed_date = format_date(date_value)
        parsed_time = format_time(row[header_index[columns["time"]]] if columns["time"] else None)
        amount = parse_amount(row[header_index[columns["amount"]]] if columns["amount"] else 0)
        machine = normalize_machine(row[header_index[columns["machine"]]] if columns["machine"] else "")
        product_raw = str(row[header_index[columns["cycleType"]]] or "").strip() if columns["cycleType"] else ""
        payment = normalize_payment(row[header_index[columns["paymentMethod"]]] if columns["paymentMethod"] else "")
        user = str(row[header_index[columns["user"]]] or "").strip() if columns["user"] else ""
        user = user or "Não informado"

        if not parsed_date or amount <= 0:
            continue

        transactions.append(
            {
                "date": parsed_date,
                "time": parsed_time,
                "amount": amount,
                "cycleType": resolve_cycle_type(product_raw, machine),
                "productRaw": product_raw,
                "machine": machine,
                "paymentMethod": payment,
                "user": user,
                "shift": classify_shift(parsed_time),
            }
        )

    workbook.close()
    return transactions


def main():
    import sys

    excel_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_EXCEL
    if not excel_path.exists():
        raise SystemExit(f"Planilha não encontrada: {excel_path}")

    transactions = export_excel(excel_path)
    payload = {
        "sourceFile": excel_path.name,
        "loadedAt": datetime.utcnow().isoformat() + "Z",
        "transactions": transactions,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(item["amount"] for item in transactions)
    print(f"OK: {len(transactions)} vendas | R$ {total:,.2f}".replace(",", "X").replace(".", ",").replace("X", "."))
    print(f"Arquivo gerado: {OUTPUT}")


if __name__ == "__main__":
    main()
