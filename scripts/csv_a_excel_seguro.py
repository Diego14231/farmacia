"""
Convierte el CSV de clasificar_medicamentos.py a un .xlsx donde la columna
"codigo" queda forzada como TEXTO -- para que Excel no la convierta a
notación científica (ej. "7806130012257" -> "7.80613E+12") al abrirlo.

Uso:
  python csv_a_excel_seguro.py clasificacion_salida.csv clasificacion_salida.xlsx

Importante: usa SIEMPRE el .xlsx generado por este script para revisar/editar
en Excel -- si abres el .csv directo con doble clic y lo guardas, Excel
vuelve a dañar los códigos.
"""

import csv
import sys

from openpyxl import Workbook


def main():
    if len(sys.argv) != 3:
        print("Uso: python csv_a_excel_seguro.py <entrada.csv> <salida.xlsx>")
        sys.exit(1)

    path_csv, path_xlsx = sys.argv[1], sys.argv[2]

    with open(path_csv, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        filas = list(reader)

    wb = Workbook()
    ws = wb.active
    ws.title = "clasificacion"

    for fila in filas:
        ws.append(fila)

    # columna "codigo" es la A -- forzarla a texto en todas las filas de datos
    for celda in ws["A"][1:]:
        celda.number_format = "@"
        if celda.value is not None:
            celda.value = str(celda.value)

    ws.freeze_panes = "A2"
    wb.save(path_xlsx)
    print(f"Listo: {path_xlsx} ({len(filas) - 1} filas de datos)")


if __name__ == "__main__":
    main()
