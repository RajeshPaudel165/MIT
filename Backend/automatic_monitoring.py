import os
import time
import threading
from datetime import datetime, timedelta
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.message import EmailMessage
import mimetypes
import cv2
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    firebase_available = True
except ImportError:
    firebase_available = False
    print("Firebase not available - automatic monitoring disabled")

class AutomaticMonitoring:
    def __init__(self):
        self.db = None
        self.monitoring_active = False
        self.check_interval = 300  # 5 minutes in seconds
        self.last_weather_alert = {}
        self.last_soil_alert = {}
        
        # Initialize Firebase if available
        if firebase_available:
            try:
                try:
                    app = firebase_admin.get_app()
                    self.db = firestore.client(app)
                    print("✅ Firebase connected for automatic monitoring")
                except ValueError:
                    if not firebase_admin._apps:
                        firebase_admin.initialize_app()
                        self.db = firestore.client()
                        print("✅ Firebase connected for automatic monitoring")
                    else:
                        self.db = firestore.client()
                        print("✅ Firebase connected for automatic monitoring")
            except Exception as e:
                print(f"⚠️ Firebase initialization failed for monitoring: {e}")
                self.db = None
        else:
            print("⚠️ Firebase not available - monitoring disabled")
    
    def get_user_emails(self):
        """Get list of user emails from Firebase users or settings"""
        # For now, we'll use a default email from environment
        # In a real app, you'd get this from user profiles
        default_email = os.environ.get('DEFAULT_USER_EMAIL', 'mailrajeshpaudel@gmail.com')
        return [default_email] if default_email else []
    
      
    # def send_email(self, to_email, subject, message):
    #     """Send email using Gmail SMTP"""
    #     try:
    #         gmail_email = os.environ.get('GMAIL_EMAIL')
    #         gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
    #         
    #         if not gmail_email or not gmail_password:
    #             print(f"📝 Would send email to: {to_email} - Subject: {subject}")
    #             return False
    #         
    #         msg = MIMEMultipart('alternative')
    #         msg['Subject'] = subject
    #         msg['From'] = gmail_email
    #         msg['To'] = to_email
    #         
    #         html_part = MIMEText(message, 'html')
    #         msg.attach(html_part)
    #         
    #         server = smtplib.SMTP("smtp.gmail.com", 587)
    #         server.starttls()
    #         server.login(gmail_email, gmail_password)
    #         server.send_message(msg)
    #         server.quit()
    #         
    #         print(f"✅ Alert email sent to: {to_email}")
    #         return True
    #         
    #     except Exception as e:
    #         print(f"❌ Failed to send email: {e}")
    #         return False
    
    def send_email(self, to_email, subject, message):
        """Send email using Gmail SMTP"""
        try:
            gmail_email = os.environ.get('GMAIL_EMAIL')
            gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
            if not gmail_email or not gmail_password:
                print(f"� Would send email to: {to_email} - Subject: {subject}")
                return False
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = gmail_email
            msg['To'] = to_email
            html_part = MIMEText(message, 'html')
            msg.attach(html_part)
            server = smtplib.SMTP("smtp.gmail.com", 587)
            server.starttls()
            server.login(gmail_email, gmail_password)
            server.send_message(msg)
            server.quit()
            print(f"✅ Alert email sent to: {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return False

    def send_email_with_image(self, image_path, to_email):
        """Send an email with the captured image."""
        try:
            gmail_email = os.environ.get('GMAIL_EMAIL')
            gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
            if not gmail_email or not gmail_password:
                print(f"📝 Would send email to: {to_email} - Subject: Security Alert")
                return False
            msg = EmailMessage()
            msg['Subject'] = 'Security Alert: Motion Detected'
            msg['From'] = gmail_email
            msg['To'] = to_email
            msg.set_content('Motion detected. See attached image.')
            with open(image_path, 'rb') as img:
                img_data = img.read()
                img_type, _ = mimetypes.guess_type(img.name)
                if img_type:
                    maintype, subtype = img_type.split('/')
                else:
                    maintype, subtype = 'image', 'jpeg'
                msg.add_attachment(img_data, maintype=maintype, subtype=subtype, filename='motion.jpg')
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
                smtp.login(gmail_email, gmail_password)
                smtp.send_message(msg)
            print(f"📧 Email sent with image {image_path}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email with image: {e}")
            return False

    def monitor_motion_and_alert(self, camera_index=0, motion_threshold=30):
        """Monitor for motion, capture image, send email alert, and upload to Firebase."""
        print("🚨 Starting motion detection for security alerts...")
        cap = cv2.VideoCapture(camera_index)
        ret, frame1 = cap.read()
        ret, frame2 = cap.read()
        while True:
            diff = cv2.absdiff(frame1, frame2)
            gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5,5), 0)
            _, thresh = cv2.threshold(blur, 20, 255, cv2.THRESH_BINARY)
            dilated = cv2.dilate(thresh, None, iterations=3)
            contours, _ = cv2.findContours(dilated, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            motion_detected = False
            for contour in contours:
                if cv2.contourArea(contour) < motion_threshold:
                    continue
                motion_detected = True
                # Draw rectangle (optional)
                (x, y, w, h) = cv2.boundingRect(contour)
                cv2.rectangle(frame1, (x, y), (x+w, y+h), (0,255,0), 2)
            if motion_detected:
                timestamp = int(time.time())
                img_path = f"motion_{timestamp}.jpg"
                cv2.imwrite(img_path, frame1)
                # Send email
                for email in self.get_user_emails():
                    self.send_email_with_image(img_path, email)
                print(f"📸 Motion detected and image saved: {img_path}")
                # Upload to Firebase Storage
                self.upload_photo_to_firebase(img_path, timestamp)
                time.sleep(10)  # Avoid spamming
            frame1 = frame2
            ret, frame2 = cap.read()
            if not ret:
                break
        cap.release()
        cv2.destroyAllWindows()

    def upload_photo_to_firebase(self, img_path, timestamp):
        """Upload photo to Firebase Storage and log in Firestore."""
        if not firebase_available or self.db is None:
            print("⚠️ Firebase not available, skipping upload.")
            return
        try:
            from firebase_admin import storage
            bucket = storage.bucket()
            blob = bucket.blob(f"motion_photos/{os.path.basename(img_path)}")
            blob.upload_from_filename(img_path)
            blob.make_public()
            photo_url = blob.public_url
            print(f"☁️ Uploaded photo to Firebase: {photo_url}")
            # Log event in Firestore
            doc_ref = self.db.collection("motion_events").document(str(timestamp))
            doc_ref.set({
                "timestamp": timestamp,
                "photo_url": photo_url,
                "event": "motion_detected"
            })
            print(f"📝 Motion event logged in Firestore.")
        except Exception as e:
            print(f"❌ Failed to upload photo to Firebase: {e}")
    
    def monitoring_loop(self):
        """Main monitoring loop that runs in background"""
        print(f"🔄 Starting automatic monitoring (checking every {self.check_interval} seconds)")
        
        while self.monitoring_active:
            try:
                print(f"🔍 Checking conditions at {datetime.now().strftime('%H:%M:%S')}")
                
                # Check soil conditions
                self.check_soil_conditions()
                
                # Check weather conditions
                self.check_weather_conditions()
                
                print(f"✅ Monitoring check complete")
                
                # Wait for next check
                time.sleep(self.check_interval)
                
            except Exception as e:
                print(f"❌ Error in monitoring loop: {e}")
                time.sleep(60)  # Wait 1 minute before retrying
    
    def start_monitoring(self):
        """Start automatic monitoring in background thread"""
        if self.monitoring_active:
            print("⚠️ Monitoring already active")
            return True
        
        self.monitoring_active = True
        
        # Start monitoring in background thread (works even without Firebase for weather)
        monitoring_thread = threading.Thread(target=self.monitoring_loop, daemon=True)
        monitoring_thread.start()
        
        print("🚀 Automatic monitoring started!")
        return True
    
    def stop_monitoring(self):
        """Stop automatic monitoring"""
        self.monitoring_active = False
        print("⏹️ Automatic monitoring stopped")
    
    def get_status(self):
        """Get monitoring status"""
        return {
            'active': self.monitoring_active,
            'firebase_available': self.db is not None,
            'check_interval': self.check_interval,
            'last_weather_alerts': len(self.last_weather_alert),
            'last_soil_alerts': len(self.last_soil_alert)
        }

# Global monitoring instance
automatic_monitor = AutomaticMonitoring()


if __name__ == "__main__":
    # Automatically start motion detection and email alert
    automatic_monitor.monitor_motion_and_alert(camera_index=0, motion_threshold=30)