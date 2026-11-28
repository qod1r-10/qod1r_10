"""BTR-80 saytini internetsiz ishlaydigan bitta HTML faylga yig'adi (fleshka uchun).

Ishlatish:  python3 tools/build_offline.py <node_modules papkasi> <chiqish fayli>
node_modules ichida: esbuild, three@0.160.0, @fontsource/{barlow-condensed,ibm-plex-sans,ibm-plex-mono}
"""
import base64, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM, OUT = sys.argv[1], sys.argv[2]

# 1) JS ni bitta modulga yig'ish (three.js ichida)
bundle = subprocess.run(
    [os.path.join(NM, '.bin', 'esbuild'), os.path.join(ROOT, 'js', 'main.js'), '--bundle', '--format=esm',
     '--target=es2022', '--minify', '--legal-comments=none', '--log-level=warning'],
    cwd=os.path.dirname(NM), check=True, capture_output=True).stdout.decode()
bundle = bundle.replace('</script', '<\\/script')

# 2) Modellar va rasmlar (sayt so'raydigan yo'llar bo'yicha)
MIME = {'.glb': 'model/gltf-binary', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp'}
embed = {}
for folder in ('models', 'img'):
    for f in sorted(os.listdir(os.path.join(ROOT, folder))):
        ext = os.path.splitext(f)[1].lower()
        if ext not in MIME or f.endswith('.glb.json'):
            continue
        data = open(os.path.join(ROOT, folder, f), 'rb').read()
        embed[f'{folder}/{f}'] = [MIME[ext], base64.b64encode(data).decode()]

# 3) Shriftlar
fonts = ''
for fam, pkg, prefix, weights in [
    ('Barlow Condensed', 'barlow-condensed', 'barlow-condensed', (500, 600, 700)),
    ('IBM Plex Sans', 'ibm-plex-sans', 'ibm-plex-sans', (400, 500, 600)),
    ('IBM Plex Mono', 'ibm-plex-mono', 'ibm-plex-mono', (500, 600)),
]:
    for w in weights:
        for sub in ('latin', 'latin-ext', 'cyrillic'):
            p = os.path.join(NM, '@fontsource', pkg, 'files', f'{prefix}-{sub}-{w}-normal.woff2')
            if os.path.exists(p):
                b64 = base64.b64encode(open(p, 'rb').read()).decode()
                fonts += f"@font-face{{font-family:'{fam}';font-weight:{w};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2')}}\n"

css = open(os.path.join(ROOT, 'css', 'style.css'), encoding='utf-8').read()

# Fayllarni blob-URL sifatida beradigan kichik "server"
prelude = """
window.__EMBED = %s;
(function () {
  var urls = {};
  function blobOf(p) {
    if (urls[p]) return urls[p];
    var e = window.__EMBED[p]; if (!e) return null;
    var bin = atob(e[1]), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    e[1] = null;
    return (urls[p] = URL.createObjectURL(new Blob([u], { type: e[0] })));
  }
  window.__asset = function (p) { return blobOf(p) || p; };
  var realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var p = typeof input === 'string' ? input : input.url;
    var b = blobOf(p);
    if (b) return realFetch(b).then(function (r) { return new Response(r.body, { status: 200, headers: { 'content-type': window.__EMBED[p][0] } }); });
    if (window.__EMBED[p] === undefined && /^(models|img)\\//.test(p)) return Promise.resolve(new Response('', { status: 404 }));
    return realFetch(input, init);
  };
})();
""" % json.dumps(embed)

html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
html = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', html)
html = re.sub(r'<link rel="stylesheet" href="https://fonts[^>]*>\n?', '', html)
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + fonts + css + '\n</style>')
html = re.sub(r'<script type="importmap">.*?</script>\n?', '', html, flags=re.S)
html = re.sub(r'<meta name="claude:viewport-fit-sides"[^>]*>\n?', '', html)
html = html.replace('<!-- PAGE:START -->\n', '').replace('<!-- PAGE:END -->\n', '')
html = html.replace('<script type="module" src="js/main.js"></script>',
                    '<script>' + prelude + '</script>\n<script type="module">\n' + bundle + '\n</script>')
open(OUT, 'w', encoding='utf-8').write(html)
print(OUT, round(os.path.getsize(OUT) / 1e6, 1), 'MB')
