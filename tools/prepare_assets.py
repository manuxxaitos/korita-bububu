#!/usr/bin/env python3
"""Prepara fotos, recortes y videos de Kora para la web. Los originales de «kora bubu» no se modifican."""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import subprocess, tempfile, json, sys

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'kora bubu'
IMG = ROOT / 'assets' / 'img'
VID = ROOT / 'assets' / 'video'
TMP = Path(tempfile.gettempdir()) / 'kora-cutouts'

PHOTOS = {
    'llegada-sillon': 'IMG_8352.JPG', 'llegada-manta': 'IMG_8388.JPG',
    'primer-vete': 'IMG_8418.JPG', 'bajo-la-silla': 'IMG_8468.JPG', 'upa-verde': 'IMG_8629.JPG',
    'abrazo-verde': 'IMG_8632.JPG', 'siesta-cama': 'IMG_8734.JPG', 'auto-1': 'A4E3A263-CB21-41F8-880A-0E1A8AFC9F5F.JPG',
    'auto-2': 'IMG_8845.JPG', 'sol-piso': 'IMG_8870.JPG', 'living': 'IMG_16ADCD18-80C3-464D-B7F4-B49B239BD8AE.JPEG',
    'cama-patas': 'IMG_8940.JPG', 'juguete-boca': 'IMG_9009.JPG', 'paseo-arbol': 'IMG_9661.JPG',
    'cama-mirada': 'D7F97BA8-8434-4999-AA68-F953F6480818.JPG', 'cuarto': '34DB40CC-0109-45A8-BA31-36361BC3E6BE.JPG',
    'ventana': '0E3D5463-CF12-4072-B73E-53A3919B1931.JPG', 'pelota': 'IMG_0435.JPG',
    'pasillo': '7a484556-f53f-4db6-aa82-774f52a58590.JPG', 'cafe': 'IMG_0610.jpg', 'panaderia-1': 'IMG_0739.jpg',
    'playa-orilla': 'IMG_0987.JPG', 'playa-sentada': 'IMG_1027.JPG', 'playa-mama': 'IMG_1030.JPG',
    'pasto-lengua': '99611118-2e04-41e5-970c-9c0a82dccab3.JPG', 'pasto-sentada': 'IMG_2731.JPG',
    'cama-estirada': 'IMG_2819.JPG', 'panza-1': 'E64F4788-243E-4497-AB85-9283C03691CC.JPG', 'panal': 'IMG_2950.JPG',
    'ascensor': 'EC9F2B18-B3C9-4F44-94B8-F4CFB52D814B.JPG', 'juguete-cama': 'IMG_3029.JPG', 'compu': 'IMG_3035.JPG',
    'toalla': 'IMG_3040.JPG', 'sol-cama': 'IMG_3289.JPG',
    'sentada-piso': '422DACD5-0DF0-4415-BCFC-940490076FF5.JPG', 'parque-sonrisa': 'IMG_3516.JPG',
    'cocina-piso': '8367EBA0-FF75-42FF-83D3-D62FF733DDAB.JPG', 'sillon-1': 'IMG_3554.JPG',
    'sillon-2': '520FC304-3B54-40EB-95CD-2928A0B1C985.JPG', 'parque-grande': 'IMG_3600.JPG',
    'vereda-otono': '057C4942-C534-40F0-87B3-95AB7D4817BA.JPG', 'bajo-mesa': 'EF88E6CD-46FD-4A9B-A0DE-7AB50AB7012C.JPG',
    'balcon': 'IMG_3915.JPG', 'cama-cerca': 'IMG_3951.JPG', 'living-ps': 'IMG_4034.JPG', 'sillon-dormida': 'IMG_4056.JPG',
    'panaderia-2': '1F59EA74-D7F9-4C06-998F-E56C767F433E.JPG', 'esquina': 'IMG_4135.JPG', 'cocina-horno': 'IMG_4212.JPG',
    'selfie-ventana': 'IMG_4243.JPG', 'piso-mirada': 'EE6CA831-5470-4FDF-8892-27A6B6660630.JPG',
    'abrazo-cocina': 'IMG_4404.JPG', 'auto-abrazo': 'IMG_4524.JPG', 'lengua-pasillo': '97F0224A-2A26-458E-853F-04F662472376.JPG',
    'living-parada': 'A04EE3DB-E2F4-4F58-AEFB-2393C61E4154.JPG', 'vete': 'IMG_4554.JPG', 'cono': 'IMG_4558.JPG',
    'cono-sillon': 'EAB36E29-E77E-4F83-A96F-BB0CCDEF0027.JPG', 'abrigo-paseo': '54E85766-0517-4FF3-B2CF-1D249DE25C83.JPG',
    'abrigo-vereda': 'EF61B460-2E80-41B2-A354-1A087C709988.JPG', 'body-1': 'IMG_4571.JPG', 'body-sillon': 'IMG_4577.JPG',
    'paseo-lluvia': 'IMG_4596.JPG', 'body-panza': 'IMG_4638.JPG', 'hojas': '30677567-4E69-4B8D-B420-07D0633A04FC.JPG',
    'sol-tarde': 'IMG_4885.JPG', 'sol-cara': 'IMG_4904.JPG', 'auto-atras': 'IMG_5240.JPG', 'espejo': 'IMG_5249.JPG',
    'puerta': 'IMG_5466.JPG', 'pasto-alto': 'IMG_5513.JPG', 'escritorio': 'IMG_5581.JPG', 'lampara': 'IMG_5618.JPG',
    'esquina-nublada': 'IMG_5674.JPG',
}
# Recortes tipo sticker (Vision de macOS).
CUTOUTS = {'pelota': 'IMG_0435.JPG', 'sillon-2': '520FC304-3B54-40EB-95CD-2928A0B1C985.JPG',
           'living-parada': 'A04EE3DB-E2F4-4F58-AEFB-2393C61E4154.JPG', 'cono': 'IMG_4558.JPG',
           'juguete-cama': 'IMG_3029.JPG', 'pasto-lengua': '99611118-2e04-41e5-970c-9c0a82dccab3.JPG'}
# Videos: nombre → (archivo, recorte en segundos o None)
VIDEOS = {'llegada': ('01C00A49-BCF8-4A6A-8E8D-4E774F0C3F8A.MP4', None), 'manta': ('IMG_9434.MOV', None),
          'primeros-pasos': ('IMG_8387.MOV', None), 'la-escoba': ('IMG_8467.MOV', None),
          'el-sillon': ('IMG_8989.MOV', None), 'mimos': ('67958B85-0FE7-4E45-813A-1B2296E3FD87.MP4', None)}


def grade(im):
    """Grade cálido de foto revelada: negros apenas levantados, luces cremosas."""
    im = ImageEnhance.Color(im).enhance(0.94)
    lut = []
    for channel, (lift, gain) in enumerate([(14, 0.985), (10, 0.965), (4, 0.9)]):
        lut += [min(255, int(lift + v * gain * (255 - lift) / 255)) for v in range(256)]
    return im.point(lut)


def photos():
    IMG.mkdir(parents=True, exist_ok=True)
    meta = {}
    for name, file in PHOTOS.items():
        im = ImageOps.exif_transpose(Image.open(SRC / file)).convert('RGB')
        im.thumbnail((1500, 1500), Image.LANCZOS)
        im = grade(im)
        im.save(IMG / f'{name}.webp', 'WEBP', quality=78, method=6)
        meta[name] = im.size
    (IMG / 'sizes.json').write_text(json.dumps(meta, indent=0))
    print('fotos', len(meta))


def cutouts():
    TMP.mkdir(exist_ok=True)
    binary = TMP / 'cutout'
    if not binary.exists():
        subprocess.run(['swiftc', '-O', str(ROOT / 'tools' / 'cutout.swift'), '-o', str(binary)], check=True)
    for name, file in CUTOUTS.items():
        raw = TMP / f'{name}.png'
        subprocess.run([str(binary), str(SRC / file), str(raw)], check=True)
        im = Image.open(raw).convert('RGBA')
        im = im.crop(im.getchannel('A').point(lambda a: 255 if a > 40 else 0).getbbox())
        im.thumbnail((900, 900), Image.LANCZOS)
        im = Image.merge('RGBA', (*grade(im.convert('RGB')).split(), im.getchannel('A')))
        # Borde blanco de sticker.
        pad = 26
        canvas = Image.new('RGBA', (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
        canvas.alpha_composite(im, (pad, pad))
        alpha = canvas.getchannel('A').point(lambda a: 255 if a > 90 else 0)
        border = alpha.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(1.2))
        sticker = Image.new('RGBA', canvas.size, (255, 251, 240, 0))
        sticker.putalpha(border)
        sticker.alpha_composite(canvas)
        sticker.save(IMG / f'sticker-{name}.webp', 'WEBP', quality=82, method=6)
    print('stickers', len(CUTOUTS))


def videos():
    VID.mkdir(parents=True, exist_ok=True)
    for name, (file, cut) in VIDEOS.items():
        out = VID / f'{name}.mp4'
        trim = ['-t', str(cut)] if cut else []
        vf = "scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)',eq=saturation=0.94"
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(SRC / file), *trim, '-vf', vf, '-r', '30',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                        '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', str(out)], check=True)
        frame = TMP / f'{name}.png'
        TMP.mkdir(exist_ok=True)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.4', '-i', str(out), '-frames:v', '1', str(frame)], check=True)
        Image.open(frame).convert('RGB').save(VID / f'{name}.webp', 'WEBP', quality=72, method=6)
        print('video', name, out.stat().st_size // 1024, 'KB')




# Fondos posterizados (paisaje en manchas planas, como afiche serigrafiado).
POSTERS = {'poster-mar': ('IMG_1027.JPG', 0.30, 0.82), 'poster-parque': ('IMG_3600.JPG', 0.22, 0.74)}


def posters():
    for name, (file, top, bottom) in POSTERS.items():
        im = ImageOps.exif_transpose(Image.open(SRC / file)).convert('RGB')
        w, h = im.size
        im = im.crop((0, int(h * top), w, int(h * bottom)))
        im.thumbnail((2000, 2000), Image.LANCZOS)
        im = im.filter(ImageFilter.MedianFilter(7)).filter(ImageFilter.MedianFilter(5))
        im = ImageEnhance.Color(im).enhance(0.9)
        im = im.quantize(colors=9, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
        im = im.filter(ImageFilter.ModeFilter(5))
        im.save(IMG / f'{name}.webp', 'WEBP', quality=80, method=6)
        print('poster', name, im.size)


if __name__ == '__main__':
    steps = sys.argv[1:] or ['photos', 'cutouts', 'videos', 'posters']
    for step in steps:
        globals()[step]()
