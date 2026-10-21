#!/usr/bin/env python3
"""Agrega srcset (versión -sm para celular), decoding async y carga diferida a las fotos de index.html.
Se puede correr de nuevo sin problema: rehace los atributos desde cero."""
from pathlib import Path
from PIL import Image
import re

ROOT = Path(__file__).resolve().parents[1]
IMG = ROOT / 'assets' / 'img'
html_path = ROOT / 'index.html'
html = html_path.read_text()
first_screen = html.index('<section id="nombre"')


def sizes_for(name):
    if name.startswith('sticker-'):
        return '(max-width: 760px) 40vw, 15vw'
    if name.startswith('poster-'):
        return '(max-width: 760px) 90vw, 1240px'
    return '(max-width: 760px) 45vw, 35vw'


def rewrite(match):
    tag, start = match.group(0), match.start()
    src = re.search(r'src="assets/img/([\w-]+)\.webp"', tag)
    if not src or src.group(1).endswith('-sm'):
        return tag
    name = src.group(1)
    small = IMG / f'{name}-sm.webp'
    tag = re.sub(r'\s(srcset|sizes|decoding|loading)="[^"]*"', '', tag)
    extra = ' decoding="async"'
    if small.exists():
        sw = Image.open(small).width
        bw = Image.open(IMG / f'{name}.webp').width
        extra = f' srcset="assets/img/{name}-sm.webp {sw}w, assets/img/{name}.webp {bw}w" sizes="{sizes_for(name)}"' + extra
    if start > first_screen:
        extra += ' loading="lazy"'
    return tag.replace(f'src="assets/img/{name}.webp"', f'src="assets/img/{name}.webp"{extra}', 1)


html = re.sub(r'<img\b[^>]*>', rewrite, html)
html_path.write_text(html)
print('fotos con srcset:', html.count('-sm.webp '))
