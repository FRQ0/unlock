---
name: video-animado-unlock
description: Fazer vídeos animados (Reels 9:16) no estilo da Unlock, com animação 2D/3D, trilha, efeitos sonoros e a voz do Thiago. Use quando pedirem vídeo, Reels ou animação da Unlock.
---

# Vídeo animado da Unlock

Use os scripts de `ferramentas/video-animado/` deste repositório como base (veja o README de lá).

1. Escreva o roteiro em cenas com tempo, texto na tela e narração. Peça as gravações reais que faltarem e diga como gravar (vertical, 1080p+, Não Perturbe, 2-3x mais longo que a cena).
2. Narração: voz Thiago da ElevenLabs (`marca/voz/README.md`). Quem gera o MP3 é o usuário; entregue o texto com comandos `[excited]`.
3. Extraia quadros das gravações com ffmpeg em `fr/<nome>/`, cortando barra de status e qualquer coisa que mostre cidade, endereço ou dados de cliente.
4. Ache as pausas da voz (`ffmpeg -af silencedetect=noise=-40dB:d=0.18`) e ajuste a duração das cenas em `SCENES` para cada frase cair na sua cena.
5. `python3 video.py stills`, olhe os quadros, corrija, depois `render`, `audio.py` e junte com ffmpeg.
6. Identidade: fundo #0D0F12 com grade, verde-limão #C8F542 só no destaque, ciano #5CE1E6 em rótulos, títulos em Archivo grosso maiúsculo. Logos em `marca/kit/logos/`.
7. Não mostrar "Frutal" nos vídeos da Unlock.
