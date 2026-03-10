import threading
from django.core.mail import EmailMessage, get_connection
from django.template.loader import render_to_string
from django.conf import settings
from users.models import SMTPSettings

class EmailThread(threading.Thread):
    def __init__(self, subject, html_content, recipient_list, from_email=None):
        self.subject = subject
        self.html_content = html_content
        self.recipient_list = recipient_list
        self.from_email = from_email
        threading.Thread.__init__(self)

    def run(self):
        try:
            # 1. Fetch active SMTP settings from DB
            smtp_config = SMTPSettings.objects.filter(is_active=True).first()
            
            if not smtp_config:
                print("Error: No active SMTP configuration found in the database. Emails will not be sent.")
                return False

            # 2. Create dynamic connection
            connection = get_connection(
                backend='django.core.mail.backends.smtp.EmailBackend',
                host=smtp_config.host,
                port=smtp_config.port,
                username=smtp_config.email_host_user,
                password=smtp_config.email_host_password,
                use_tls=smtp_config.use_tls,
                fail_silently=False,
            )

            # 3. Create and send email
            from_email = self.from_email or smtp_config.email_host_user
            msg = EmailMessage(
                subject=self.subject,
                body=self.html_content,
                from_email=from_email,
                to=self.recipient_list,
                connection=connection,
            )
            msg.content_subtype = "html"  # Main content is text/html
            msg.send()
            print(f"Email successfully sent to {self.recipient_list}")
            return True

        except Exception as e:
            print(f"Failed to send email to {self.recipient_list}. Error: {str(e)}")
            return False

def send_dynamic_email(subject, template_name, context, recipient_list):
    """
    Utility function to send HTML emails asynchronously using dynamic DB SMTP settings.
    """
    html_content = render_to_string(template_name, context)
    EmailThread(subject, html_content, recipient_list).start()
