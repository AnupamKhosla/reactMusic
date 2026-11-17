"""Wraps a 32x32 PNG into favicon.ico (an ICO file may hold a PNG directly). Usage: python3 make_ico.py in.png out.ico"""
import struct
import sys

png = open(sys.argv[1], "rb").read()
header = struct.pack("<HHH", 0, 1, 1)
entry = struct.pack("<BBBBHHII", 32, 32, 0, 0, 1, 32, len(png), 6 + 16)
with open(sys.argv[2], "wb") as f:
    f.write(header + entry + png)
