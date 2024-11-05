import re
import os
import requests
from zipfile import ZipFile
from urllib.parse import urljoin, urlparse

# URL of the remote CSS file
css_url = 'https://atugatran.github.io/FontAwesome6Pro/css/all.min.css'  # Replace with your CSS file URL
zip_output = 'fonts.zip'
base_font_dir = 'fonts'

# Regex for extracting font URLs (targets URLs containing 'webfonts')
font_pattern = re.compile(r'url\(([^)]+)\)')

# Download and read the CSS file
try:
    css_response = requests.get(css_url)
    css_response.raise_for_status()
    css_content = css_response.text
except Exception as e:
    print(f"Failed to download CSS file: {e}")
    exit()

# Find all URLs and filter for webfonts only
urls = font_pattern.findall(css_content)
font_urls = [url.strip('"').strip("'") for url in urls if 'webfonts' in url and not url.startswith("data:")]

# Download and save fonts with their folder structure
for font_url in font_urls:
    # Resolve relative URLs with the base URL
    full_font_url = urljoin(css_url, font_url)
    parsed_url = urlparse(font_url)
    file_path = os.path.join(base_font_dir, parsed_url.path.lstrip('/'))

    # Create necessary directories
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    try:
        # Download the font
        font_response = requests.get(full_font_url)
        font_response.raise_for_status()

        # Save the font with its original name in its directory
        with open(file_path, 'wb') as font_file:
            font_file.write(font_response.content)
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"Skipping {full_font_url}: File not found (404)")
        else:
            print(f"Failed to download {full_font_url}: {e}")
    except Exception as e:
        print(f"Failed to download {full_font_url}: {e}")

# Zip the fonts folder with its structure
with ZipFile(zip_output, 'w') as zipf:
    for foldername, _, filenames in os.walk(base_font_dir):
        for filename in filenames:
            filepath = os.path.join(foldername, filename)
            zipf.write(filepath, os.path.relpath(filepath, base_font_dir))

print(f"Fonts have been extracted with original structure and zipped as {zip_output}")
