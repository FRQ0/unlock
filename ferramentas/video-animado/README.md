# Vídeo animado da Unlock (Reels 9:16)

Gera o vídeo de lançamento: 9 cenas, 40 s, 1080x1920, 30 fps, com animações 2D/3D
(celulares em perspectiva, cadeado 3D, chão de grade 3D, partículas, glitch),
trilha sintetizada com drop, efeitos sonoros e a narração do Thiago.

## Precisa de
- Python 3 com `Pillow` e `numpy`
- `ffmpeg`
- Fontes: Archivo Black e Inter (os caminhos estão no topo de `video.py`; ajuste se mudar de máquina)

## Pasta de trabalho (`VID_DIR`, padrão: esta pasta)
```
fr/man/ fr/note/ fr/goog/ fr/pizza/ fr/pad/   quadros JPG das gravações (30 fps)
site_full.jpg                                  print da página inteira do site no celular
out/                                           cenas e vídeo final
```
Extrair quadros de uma gravação, exemplo:
`ffmpeg -ss 0.3 -t 4 -i gravacao.mp4 -vf "crop=1206:2480:0:120,setpts=PTS/1.6,fps=30,scale=600:-2" -q:v 3 fr/goog/%04d.jpg`

## Rodar
```
python3 video.py stills      # confere quadros-chave em out/stills.png
python3 video.py render      # renderiza as 9 cenas (ou: render c5 para uma só)
python3 audio.py             # trilha + efeitos + voz em out/audio.wav
cd out && printf "file 'c%d.mp4'\n" 1 2 3 4 5 6 7 8 9 > list.txt
ffmpeg -f concat -safe 0 -i list.txt -c copy video.mp4
ffmpeg -i video.mp4 -i audio.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest final.mp4
```

## Onde mexer
- `SCENES` (fim de `video.py`): ordem e duração de cada cena
- Funções `sc1`…`sc9`: o que aparece em cada cena
- `audio.py`: `DROP` (segundo do drop), lista de efeitos e atraso da voz (0.3 s)
