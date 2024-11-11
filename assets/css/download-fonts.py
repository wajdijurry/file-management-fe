import re
import requests
import os
from urllib.parse import urljoin
from bs4 import BeautifulSoup

def download_fonts_from_css(css_url, output_dir="fonts"):
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Fetch the CSS file
    response = requests.get(css_url)
    if response.status_code != 200:
        print(f"Failed to fetch CSS file: {response.status_code}")
        return
    css_content = response.text

    # Extract font URLs (ttf, woff, woff2)
    font_urls = re.findall(r'url\(([^)]+\.(?:ttf|woff2?|eot|otf))\)', css_content)
    
    # Download each font file
    for font_url in font_urls:
        # Remove any quotes from the URL
        font_url = font_url.strip('"').strip("'")
        
        # Handle relative URLs by converting them to absolute URLs
        absolute_font_url = urljoin(css_url, font_url)
        
        # Get the font file name
        font_name = os.path.basename(absolute_font_url)
        
        # Download the font file
        try:
            print(f"Downloading {font_name} from {absolute_font_url}...")
            font_response = requests.get(absolute_font_url, stream=True)
            if font_response.status_code == 200:
                font_path = os.path.join(output_dir, font_name)
                with open(font_path, 'wb') as font_file:
                    for chunk in font_response.iter_content(chunk_size=8192):
                        font_file.write(chunk)
                print(f"Downloaded {font_name} successfully.")
            else:
                print(f"Failed to download {font_name}: {font_response.status_code}")
        except Exception as e:
            print(f"Error downloading {font_name}: {str(e)}")

def download_webfonts_folder(base_url, output_dir="fonts"):
    # Create output directory if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Fetch the base URL
    response = requests.get(base_url)
    if response.status_code != 200:
        print(f"Failed to fetch base URL: {response.status_code}")
        return
    soup = BeautifulSoup(response.text, 'html.parser')

    # Find all links ending with font extensions
    font_links = soup.find_all('a', href=re.compile(r'webfonts/.*\.(?:ttf|woff2?|eot|otf)$'))
    
    # Download each font file in the webfonts folder
    for link in font_links:
        font_url = urljoin(base_url, link['href'])
        font_name = os.path.basename(font_url)
        try:
            print(f"Downloading {font_name} from {font_url}...")
            font_response = requests.get(font_url, stream=True)
            if font_response.status_code == 200:
                font_path = os.path.join(output_dir, font_name)
                with open(font_path, 'wb') as font_file:
                    for chunk in font_response.iter_content(chunk_size=8192):
                        font_file.write(chunk)
                print(f"Downloaded {font_name} successfully.")
            else:
                print(f"Failed to download {font_name}: {font_response.status_code}")
        except Exception as e:
            print(f"Error downloading {font_name}: {str(e)}")

if __name__ == "__main__":
    css_url = input("Enter the CSS file URL: ")
    base_url = input("Enter the base URL to download webfonts folder: ")
    download_fonts_from_css(css_url)
    download_webfonts_folder(base_url)
