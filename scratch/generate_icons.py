import fitz
import os
from PIL import Image

def generate():
    logo_path = "public/Logomarca.png"
    
    if not os.path.exists(logo_path):
        print(f"Erro: Arquivo {logo_path} não encontrado.")
        return

    # 1. Carregar Logo
    print(f"Carregando logo de {logo_path}...")
    img = Image.open(logo_path).convert("RGBA")

    for folder, size in sizes_android.items():
        res_path = f"android/app/src/main/res/{folder}"
        if not os.path.exists(res_path):
            os.makedirs(res_path, exist_ok=True)
            
        resized = img.resize((size, size), Image.LANCZOS)
        resized.save(f"{res_path}/ic_launcher.png")
        resized.save(f"{res_path}/ic_launcher_round.png")
        print(f"Ícones gerados em {folder}")

    # 3. Gerar Ícones iOS (se a pasta existir)
    ios_path = "ios/App/App/Assets.xcassets/AppIcon.appiconset"
    if os.path.exists(ios_path):
        print("Gerando ícones iOS...")
        sizes_ios = [20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024]
        for size in sizes_ios:
            resized = img.resize((size, size), Image.LANCZOS)
            # Simplificando: iOS geralmente espera nomes específicos no Contents.json, 
            # mas aqui vamos apenas salvar com o tamanho para referência.
            resized.save(f"{ios_path}/icon-{size}.png")
        print("Ícones iOS gerados.")
    else:
        print("Pasta iOS não encontrada. Pulando ícones iOS.")

if __name__ == "__main__":
    generate()
