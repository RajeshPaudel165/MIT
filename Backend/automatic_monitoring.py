import os
import time
import threading
from datetime import datetime, timedelta
# import smtplib
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart
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
    
    def check_soil_conditions(self):
        """Check soil sensor data and send alerts if conditions are bad"""
        if not self.db:
            # For testing without Firebase, use mock critical data
            print("📊 Testing mode: Using mock critical soil data")
            mock_critical_soil = {
                'temperature': 15,  # Critical low
                'moisture': 15,     # Critical low  
                'pH': 4.5,         # Too acidic
                'nitrogen': 0,
                'phosphorus': 0,
                'potassium': 0,
                'timestamp': datetime.now()
            }
            
            alerts = []
            
            # Check mock critical conditions
            if mock_critical_soil['moisture'] < 20:
                alerts.append({
                    'type': 'critical_low_moisture',
                    'severity': 'high',
                    'message': f"🚨 CRITICAL: Soil moisture extremely low at {mock_critical_soil['moisture']}%",
                    'value': mock_critical_soil['moisture'],
                    'recommendations': [
                        "Water immediately and deeply",
                        "Check irrigation system",
                        "Add water-retaining mulch",
                        "Monitor soil moisture hourly"
                    ]
                })
            
            if mock_critical_soil['pH'] < 5.0:
                alerts.append({
                    'type': 'critical_acidic_soil',
                    'severity': 'medium',
                    'message': f"🧪 WARNING: Soil too acidic at pH {mock_critical_soil['pH']}",
                    'value': mock_critical_soil['pH'],
                    'recommendations': [
                        "Add lime to raise pH",
                        "Test soil pH weekly",
                        "Consider pH buffer solutions",
                        "Choose acid-tolerant plants"
                    ]
                })
            
            # Send test alerts
            if alerts:
                user_emails = self.get_user_emails()
                for email in user_emails:
                    for alert in alerts:
                        alert_key = f"{email}_{alert['type']}"
                        last_sent = self.last_soil_alert.get(alert_key)
                        
                        if not last_sent or (datetime.now() - last_sent).total_seconds() > 300:  # 5 min for testing
                            # self.send_soil_alert_email(email, alert, mock_critical_soil)
                            print(f"📧 Would send test soil alert: {alert['type']} to {email} (EMAIL DISABLED)")
                            self.last_soil_alert[alert_key] = datetime.now()
                            print(f"📧 Sent test soil alert: {alert['type']} to {email}")
                        else:
                            print(f"⏰ Skipping recent soil alert: {alert['type']} to {email}")
            
            return
        
        try:
            # Get latest soil data
            soil_ref = self.db.collection('soil_data')
            docs = soil_ref.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(5).get()
            
            if not docs:
                print("📊 No soil data found")
                return
            
            # Analyze recent soil readings
            soil_readings = []
            for doc in docs:
                data = doc.to_dict()
                soil_readings.append({
                    'temperature': data.get('temperature', 20),
                    'moisture': data.get('moisture', 50),
                    'pH': data.get('pH', 7.0),
                    'nitrogen': data.get('nitrogen', 0),
                    'phosphorus': data.get('phosphorus', 0),
                    'potassium': data.get('potassium', 0),
                    'timestamp': data.get('timestamp', datetime.now())
                })
            
            # Check for critical conditions
            alerts = []
            latest_reading = soil_readings[0] if soil_readings else None
            
            if latest_reading:
                # Critical moisture levels
                if latest_reading['moisture'] < 20:
                    alerts.append({
                        'type': 'critical_low_moisture',
                        'severity': 'high',
                        'message': f"🚨 CRITICAL: Soil moisture extremely low at {latest_reading['moisture']}%",
                        'value': latest_reading['moisture'],
                        'recommendations': [
                            "Water immediately and deeply",
                            "Check irrigation system",
                            "Add water-retaining mulch",
                            "Monitor soil moisture hourly"
                        ]
                    })
                elif latest_reading['moisture'] > 85:
                    alerts.append({
                        'type': 'critical_high_moisture',
                        'severity': 'high',
                        'message': f"💧 CRITICAL: Soil waterlogged at {latest_reading['moisture']}%",
                        'value': latest_reading['moisture'],
                        'recommendations': [
                            "Stop watering immediately",
                            "Improve drainage",
                            "Check for water leaks",
                            "Consider temporary drainage solutions"
                        ]
                    })
                
                # Critical temperature
                if latest_reading['temperature'] > 35:
                    alerts.append({
                        'type': 'critical_high_soil_temp',
                        'severity': 'high',
                        'message': f"🌡️ CRITICAL: Soil overheating at {latest_reading['temperature']}°C",
                        'value': latest_reading['temperature'],
                        'recommendations': [
                            "Apply thick mulch immediately",
                            "Increase watering to cool soil",
                            "Provide shade over soil area",
                            "Water in early morning"
                        ]
                    })
                elif latest_reading['temperature'] < 5:
                    alerts.append({
                        'type': 'critical_low_soil_temp',
                        'severity': 'medium',
                        'message': f"❄️ WARNING: Soil too cold at {latest_reading['temperature']}°C",
                        'value': latest_reading['temperature'],
                        'recommendations': [
                            "Cover plants with frost protection",
                            "Use mulch for insulation",
                            "Consider heating mats for seedlings",
                            "Monitor for frost damage"
                        ]
                    })
                
                # Critical pH levels
                if latest_reading['pH'] < 5.0:
                    alerts.append({
                        'type': 'critical_acidic_soil',
                        'severity': 'medium',
                        'message': f"🧪 WARNING: Soil too acidic at pH {latest_reading['pH']}",
                        'value': latest_reading['pH'],
                        'recommendations': [
                            "Add lime to raise pH",
                            "Test soil pH weekly",
                            "Consider pH buffer solutions",
                            "Choose acid-tolerant plants"
                        ]
                    })
                elif latest_reading['pH'] > 8.5:
                    alerts.append({
                        'type': 'critical_alkaline_soil',
                        'severity': 'medium',
                        'message': f"🧪 WARNING: Soil too alkaline at pH {latest_reading['pH']}",
                        'value': latest_reading['pH'],
                        'recommendations': [
                            "Add sulfur to lower pH",
                            "Use acidic fertilizers",
                            "Add organic matter",
                            "Test pH regularly"
                        ]
                    })
                
                # Send alerts if conditions are critical
                if alerts:
                    user_emails = self.get_user_emails()
                    for email in user_emails:
                        for alert in alerts:
                            # Check if we recently sent this type of alert
                            alert_key = f"{email}_{alert['type']}"
                            last_sent = self.last_soil_alert.get(alert_key)
                            
                            # Only send if we haven't sent this alert in the last hour
                            if not last_sent or (datetime.now() - last_sent).total_seconds() > 3600:
                                # self.send_soil_alert_email(email, alert, latest_reading)
                                print(f"📧 Would send soil alert: {alert['type']} to {email} (EMAIL DISABLED)")
                                self.last_soil_alert[alert_key] = datetime.now()
                                print(f"📧 Sent soil alert: {alert['type']} to {email}")
                            else:
                                print(f"⏰ Skipping recent soil alert: {alert['type']} to {email}")
                else:
                    print(f"✅ Soil conditions normal: {latest_reading['moisture']}% moisture, {latest_reading['temperature']}°C, pH {latest_reading['pH']}")
                        
        except Exception as e:
            print(f"❌ Error checking soil conditions: {e}")
    
    def check_weather_conditions(self):
        """Check weather conditions and send alerts if weather is bad"""
        try:
            # Import weather monitor here to avoid circular imports
            from weather_monitor import weather_monitor
            
            current_weather = weather_monitor.get_current_weather()
            alerts = weather_monitor.check_weather_alerts(None, current_weather)
            
            if alerts:
                user_emails = self.get_user_emails()
                for email in user_emails:
                    for alert in alerts:
                        # Check if we recently sent this type of alert
                        alert_key = f"{email}_{alert['type']}"
                        last_sent = self.last_weather_alert.get(alert_key)
                        
                        # Only send if we haven't sent this alert in the last 2 hours
                        if not last_sent or (datetime.now() - last_sent).total_seconds() > 7200:
                            # self.send_weather_alert_email(email, alert, current_weather)
                            print(f"📧 Would send weather alert: {alert['type']} to {email} (EMAIL DISABLED)")
                            self.last_weather_alert[alert_key] = datetime.now()
                            print(f"📧 Sent weather alert: {alert['type']} to {email}")
                        else:
                            print(f"⏰ Skipping recent weather alert: {alert['type']} to {email}")
            else:
                print(f"✅ Weather conditions good: {current_weather['temperature']}°C, {current_weather['description']}")
                
        except Exception as e:
            print(f"❌ Error checking weather conditions: {e}")
    
    # def send_soil_alert_email(self, user_email, alert, soil_data):
    #     """Send soil condition alert email"""
    #     try:
    #         subject = f"🌱 Soil Alert: {alert['type'].replace('_', ' ').title()}"
    #         
    #         recommendations_html = "".join([f"<li>{rec}</li>" for rec in alert['recommendations']])
    #         
    #         message = f"""
    #         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    #             <h2 style="color: #2563eb;">🌱 Soil Condition Alert</h2>
    #             
    #             <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h3 style="color: #92400e; margin-top: 0;">⚠️ {alert['message']}</h3>
    #             </div>
    #             
    #             <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h4>Current Soil Conditions:</h4>
    #                 <ul style="list-style: none; padding: 0;">
    #                     <li>💧 <strong>Moisture:</strong> {soil_data['moisture']}%</li>
    #                     <li>🌡️ <strong>Temperature:</strong> {soil_data['temperature']}°C</li>
    #                     <li>🧪 <strong>pH Level:</strong> {soil_data['pH']}</li>
    #                     <li>🌿 <strong>Nitrogen:</strong> {soil_data['nitrogen']} ppm</li>
    #                     <li>🌾 <strong>Phosphorus:</strong> {soil_data['phosphorus']} ppm</li>
    #                     <li>🍃 <strong>Potassium:</strong> {soil_data['potassium']} ppm</li>
    #                 </ul>
    #             </div>
    #             
    #             <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h4 style="color: #065f46;">🚨 Immediate Actions Required:</h4>
    #                 <ul style="color: #065f46;">
    #                     {recommendations_html}
    #                 </ul>
    #             </div>
    #             
    #             <p style="color: #6b7280; font-size: 14px;">
    #                 This alert was generated automatically based on your soil sensor readings. 
    #                 Take action immediately to protect your plants.
    #             </p>
    #         </div>
    #         """
    #         
    #         self.send_email(user_email, subject, message)
    #         
    #     except Exception as e:
    #         print(f"❌ Failed to send soil alert email: {e}")
    
    def send_soil_alert_email(self, user_email, alert, soil_data):
        """Send soil condition alert email - DISABLED"""
        print(f"📧 Would send soil alert email to {user_email}: {alert['type']} (EMAIL DISABLED)")
    
    # def send_weather_alert_email(self, user_email, alert, weather_data):
    #     """Send weather alert email"""
    #     try:
    #         subject = f"🌦️ Weather Alert: {alert['type'].replace('_', ' ').title()}"
    #         
    #         recommendations_html = "".join([f"<li>{rec}</li>" for rec in alert['recommendations']])
    #         
    #         message = f"""
    #         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    #             <h2 style="color: #2563eb;">🌦️ Weather Alert for Your Plants</h2>
    #             
    #             <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h3 style="color: #92400e; margin-top: 0;">⚠️ {alert['message']}</h3>
    #             </div>
    #             
    #             <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h4>Current Weather Conditions:</h4>
    #                 <ul style="list-style: none; padding: 0;">
    #                     <li>🌡️ <strong>Temperature:</strong> {weather_data['temperature']}°C</li>
    #                     <li>💧 <strong>Humidity:</strong> {weather_data['humidity']}%</li>
    #                     <li>🌤️ <strong>Conditions:</strong> {weather_data['description']}</li>
    #                     <li>💨 <strong>Wind Speed:</strong> {weather_data['wind_speed']} km/h</li>
    #                 </ul>
    #             </div>
    #             
    #             <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin: 16px 0;">
    #                 <h4 style="color: #065f46;">🌱 Recommended Actions:</h4>
    #                 <ul style="color: #065f46;">
    #                     {recommendations_html}
    #                 </ul>
    #             </div>
    #             
    #             <p style="color: #6b7280; font-size: 14px;">
    #                 This alert was generated automatically based on current weather conditions.
    #             </p>
    #         </div>
    #         """
    #         
    #         self.send_email(user_email, subject, message)
    #         
    #     except Exception as e:
    #         print(f"❌ Failed to send weather alert email: {e}")
    
    def send_weather_alert_email(self, user_email, alert, weather_data):
        """Send weather alert email - DISABLED"""
        print(f"📧 Would send weather alert email to {user_email}: {alert['type']} (EMAIL DISABLED)")
    
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
        """Send email using Gmail SMTP - DISABLED"""
        print(f"📧 Would send email to {to_email}: {subject} (EMAIL DISABLED)")
        return False
    
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