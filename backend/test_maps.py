import requests

url = 'https://maps.app.goo.gl/39Zj1PhrfyMpXJSX9'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

try:
    r = requests.get(url, headers=headers, allow_redirects=True, timeout=10)
    print('Status:', r.status_code)
    print('Final URL:', r.url)
    
    import re
    patterns = [
        r'@(-?\d+\.?\d*),(-?\d+\.?\d*)',
        r'!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)',
    ]
    for p in patterns:
        m = re.search(p, r.url)
        if m:
            print(f'Found: {m.group(1)}, {m.group(2)}')
            break
    else:
        print('No coords in URL')
        # Check body
        for p in patterns:
            m = re.search(p, r.text[:3000])
            if m:
                print(f'Found in body: {m.group(1)}, {m.group(2)}')
                break
except Exception as e:
    print('Error:', e)
