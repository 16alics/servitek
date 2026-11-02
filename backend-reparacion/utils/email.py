import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()

def enviar_correo_servicio(destinatario: str, asunto: str, cuerpo: str):
    servidor_smtp = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    puerto = int(os.getenv("MAIL_PORT", 587))
    usuario = os.getenv("MAIL_USERNAME")
    password = os.getenv("MAIL_PASSWORD")
    remitente = os.getenv("MAIL_FROM")

    # Configurar el mensaje
    mensaje = MIMEMultipart()
    mensaje["From"] = remitente
    mensaje["To"] = destinatario
    mensaje["Subject"] = asunto

    mensaje.attach(MIMEText(cuerpo, "plain"))

    try:
        # Conexión real al servidor SMTP de Gmail usando TLS
        conexion = smtplib.SMTP(servidor_smtp, puerto)
        conexion.starttls()
        conexion.login(usuario, password)
        conexion.sendmail(remitente, destinatario, mensaje.as_string())
        conexion.quit()
        print(f"Correo real enviado exitosamente a {destinatario}")
    except Exception as e:
        print(f"Error al enviar el correo: {e}")
        raise e
    
    
    
def enviar_correo_agradecimiento(destinatario: str, cliente_nombre: str, codigo_servicio: str):
    if not destinatario or destinatario == "No registrado":
        return
    
    # Configura tus credenciales de correo (Gmail, Outlook, etc.)
    remitente = "tu_correo@gmail.com"
    password = "tu_contraseña_de_aplicacion" # Contraseña de aplicación de tu correo
    
    asunto = f"¡Gracias por confiar en Servitek! Orden {codigo_servicio}"
    
    cuerpo = f"""
    Hola {cliente_nombre},
    
    ¡Te escribimos de Servitek! Queremos agradecerte por confiar en nuestro taller para la reparación de tu equipo.
    Tu orden con código {codigo_servicio} ha sido entregada con éxito.
    
    Esperamos que tu equipo funcione a la perfección. Si tienes alguna duda o inconveniente futuro, no dudes en contactarnos.
    
    ¡Que tengas un excelente día!
    Atentamente,
    El equipo de Servitek
    """
    
    try:
        mensaje = MIMEMultipart()
        mensaje["From"] = remitente
        mensaje["To"] = destinatario
        mensaje["Subject"] = asunto
        mensaje.attach(MIMEText(cuerpo, "plain"))
        
        # Conexión con el servidor SMTP (ejemplo con Gmail puerto 587)
        servidor = smtplib.SMTP("smtp.gmail.com", 587)
        servidor.starttls()
        servidor.login(remitente, password)
        servidor.sendmail(remitente, destinatario, mensaje.as_string())
        servidor.quit()
        print(f"Correo de agradecimiento enviado exitosamente a {destinatario}")
    except Exception as e:
        print(f"Error al enviar el correo: {str(e)}")