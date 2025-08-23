import os
import google.generativeai as genai

def main():
    # API açarını təyin et
    api_key = os.getenv('GOOGLE_API_KEY')
    if not api_key:
        print("Xəta: GOOGLE_API_KEY təyin edilməyib!")
        print("Zəhmət olmasa, .env faylında GOOGLE_API_KEY dəyərini təyin edin.")
        return

    # API-ya qoşul
    genai.configure(api_key=api_key)
    
    # Modeli yüklə
    model = genai.GenerativeModel('gemini-pro')
    
    print("Gemini AI ilə söhbətə xoş gəlmisiniz! Çıxmaq üçün 'çıx' yazın.")
    
    while True:
        # İstifadəçidən giriş al
        user_input = input("\nSiz: ")
        
        # Çıxış şərti
        if user_input.lower() in ['çıx', 'exit', 'quit']:
            print("Söhbət başa çatdı. Sağ olun!")
            break
            
        try:
            # Cavab al
            response = model.generate_content(user_input)
            print("\nGemini:", response.text)
            
        except Exception as e:
            print(f"Xəta baş verdi: {str(e)}")

if __name__ == "__main__":
    main()
