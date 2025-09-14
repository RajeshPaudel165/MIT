import os
# import smtplib
import subprocess
import sys
# from email.mime.text import MIMEText
# from email.mime.multipart import MIMEMultipart
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Load environment variables efficiently
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

app = Flask(__name__)
CORS(app)

# Motion detection state
motion_detected_flag = threading.Event()

def send_motion_email(to_email, subject, message):
    try:
        gmail_email = os.environ.get('GMAIL_EMAIL')
        gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
        if gmail_email and gmail_password:
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
            print(f"✅ Motion alert email sent to: {to_email}")
            return True
        else:
            print(f"📝 Would send motion alert to: {to_email}")
            return False
    except Exception as e:
        print(f"❌ Failed to send motion alert email: {e}")
        return False

# Threaded function to run motion_detect_pose.py
def run_motion_detection():
    script_path = os.path.join(os.path.dirname(__file__), 'motion_detect_pose.py')
    process = subprocess.Popen([sys.executable, script_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    while True:
        line = process.stdout.readline()
        if not line:
            break
        if '🎯 Detection:' in line:
            print('Motion detected:', line.strip())
            motion_detected_flag.set()
            # Send email (customize recipient)
            send_motion_email(
                to_email=os.environ.get('MOTION_ALERT_EMAIL', 'your@email.com'),
                subject='Motion Detected!',
                message=f'<h2>Motion detected in Outdoor Mode!</h2><pre>{line.strip()}</pre>'
            )
    process.wait()

@app.route('/motion-detect', methods=['POST'])
def motion_detect():
    # Start motion detection in a thread
    motion_detected_flag.clear()
    t = threading.Thread(target=run_motion_detection, daemon=True)
    t.start()
    return jsonify({'status': 'started'}), 200

@app.route('/motion-status', methods=['GET'])
def motion_status():
    detected = motion_detected_flag.is_set()
    return jsonify({'motion_detected': detected}), 200

# Lazy import weather_monitor to speed up startup
weather_monitor = None

def get_weather_monitor():
    """Lazy load weather monitor to avoid slow startup"""
    global weather_monitor
    if weather_monitor is None:
        from weather_monitor import weather_monitor as wm
        weather_monitor = wm
    return weather_monitor

# Import and start automatic monitoring
from automatic_monitoring import automatic_monitor


# Core email functionality - DISABLED
@app.route("/send-email", methods=["POST"])
def send_email():
    try:
        data = request.get_json()
        to_email = data.get('to')
        subject = data.get('subject', 'Soil Savvy Suite Notification')
        message = data.get('message')
        
        if not to_email or not message:
            return jsonify({'error': 'Missing "to" email or "message"'}), 400
        
        # EMAIL SENDING DISABLED - just log the request
        print(f"📝 EMAIL DISABLED - Would send email to: {to_email}")
        print(f"📝 Subject: {subject}")
        print(f"📝 Message: {message}")
        return jsonify({'status': 'disabled', 'to': to_email, 'subject': subject, 'message': 'Email sending is disabled'}), 200
        
    except Exception as exc:
        print(f"Error processing email request: {exc}")
        return jsonify({'error': str(exc)}), 500


# Weather API endpoints
@app.route("/weather/current", methods=["GET"])
def get_current_weather():
    try:
        city = request.args.get('city')
        country = request.args.get('country')
        
        wm = get_weather_monitor()
        weather_data = wm.get_current_weather(city, country)
        return jsonify(weather_data), 200
        
    except Exception as exc:
        print(f"Error getting weather: {exc}")
        return jsonify({'error': str(exc)}), 500


@app.route("/weather/forecast", methods=["GET"])
def get_weather_forecast():
    try:
        city = request.args.get('city')
        country = request.args.get('country')
        
        wm = get_weather_monitor()
        forecast_data = wm.get_weather_forecast(city, country)
        return jsonify(forecast_data), 200
        
    except Exception as exc:
        print(f"Error getting forecast: {exc}")
        return jsonify({'error': str(exc)}), 500


@app.route("/weather/alerts", methods=["POST"])
def check_weather_alerts():
    try:
        data = request.get_json()
        user_email = data.get('email')
        
        if not user_email:
            return jsonify({'error': 'Email address required'}), 400
        
        wm = get_weather_monitor()
        current_weather = wm.get_current_weather()
        alerts = wm.check_weather_alerts(user_email, current_weather)
        
        # Send email alerts if any - EMAIL DISABLED
        if alerts:
            for alert in alerts:
                try:
                    # send_weather_alert_email(user_email, alert, current_weather)
                    print(f"📧 Would send weather alert email to {user_email}: {alert['type']} (EMAIL DISABLED)")
                except Exception as e:
                    print(f"Failed to process weather alert: {e}")
        
        return jsonify({
            'weather': current_weather,
            'alerts': alerts,
            'alerts_sent': len(alerts)
        }), 200
        
    except Exception as exc:
        print(f"Error checking weather alerts: {exc}")
        return jsonify({'error': str(exc)}), 500


@app.route("/weather/summary", methods=["GET"])
def get_weather_summary():
    try:
        wm = get_weather_monitor()
        summary = wm.get_weather_summary()
        return jsonify(summary), 200
        
    except Exception as exc:
        print(f"Error getting weather summary: {exc}")
        return jsonify({'error': str(exc)}), 500


# def send_weather_alert_email(user_email, alert, weather_data):
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
#         </div>
#         """
#         
#         # Send email using Gmail SMTP
#         gmail_email = os.environ.get('GMAIL_EMAIL')
#         gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
#         
#         if gmail_email and gmail_password:
#             msg = MIMEMultipart('alternative')
#             msg['Subject'] = subject
#             msg['From'] = gmail_email
#             msg['To'] = user_email
#             
#             html_part = MIMEText(message, 'html')
#             msg.attach(html_part)
#             
#             server = smtplib.SMTP("smtp.gmail.com", 587)
#             server.starttls()
#             server.login(gmail_email, gmail_password)
#             server.send_message(msg)
#             server.quit()
#             
#             print(f"✅ Weather alert email sent to: {user_email}")
#             return True
#         else:
#             print(f"📝 Would send weather alert to: {user_email}")
#             return False
#             
#     except Exception as e:
#         print(f"❌ Failed to send weather alert email: {e}")
#         return False

def send_weather_alert_email(user_email, alert, weather_data):
    """Send weather alert email - DISABLED"""
    print(f"📧 Would send weather alert email to {user_email}: {alert['type']} (EMAIL DISABLED)")
    return False


# Health check endpoints
@app.route("/", methods=["GET"])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'Soil Savvy Suite Backend'}), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({'status': 'ok', 'timestamp': str(__import__('datetime').datetime.now())}), 200


# Automatic monitoring control endpoints
@app.route("/monitoring/start", methods=["POST"])
def start_monitoring():
    """Start automatic monitoring"""
    try:
        result = automatic_monitor.start_monitoring()
        if result:
            return jsonify({'status': 'started', 'message': 'Automatic monitoring started'}), 200
        else:
            return jsonify({'status': 'error', 'message': 'Failed to start monitoring'}), 500
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/monitoring/stop", methods=["POST"])
def stop_monitoring():
    """Stop automatic monitoring"""
    try:
        automatic_monitor.stop_monitoring()
        return jsonify({'status': 'stopped', 'message': 'Automatic monitoring stopped'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/monitoring/status", methods=["GET"])
def monitoring_status():
    """Get monitoring status"""
    try:
        status = automatic_monitor.get_status()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/monitoring/check-now", methods=["POST"])
def check_now():
    """Manually trigger monitoring checks"""
    try:
        print("🔍 Manual monitoring check triggered")
        automatic_monitor.check_soil_conditions()
        automatic_monitor.check_weather_conditions()
        return jsonify({'status': 'checked', 'message': 'Manual check completed'}), 200
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


# GUI Mode endpoints
@app.route("/modes/entertainment", methods=["POST"])
def launch_entertainment_mode():
    """Launch Entertainment Mode GUI"""
    try:
        # Launch as a separate process
        script_path = os.path.join(os.path.dirname(__file__), 'entertainment_mode.py')
        process = subprocess.Popen([sys.executable, script_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        return jsonify({
            'status': 'launched', 
            'message': 'Entertainment Mode GUI launched',
            'mode': 'entertainment',
            'process_id': process.pid
        }), 200
    except Exception as e:
        print(f"Error launching entertainment mode: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/modes/casual", methods=["POST"])
def launch_casual_mode():
    """Launch Casual Mode GUI"""
    try:
        # Launch as a separate process
        script_path = os.path.join(os.path.dirname(__file__), 'casual_mode.py')
        process = subprocess.Popen([sys.executable, script_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        return jsonify({
            'status': 'launched', 
            'message': 'Casual Mode GUI launched',
            'mode': 'casual',
            'process_id': process.pid
        }), 200
    except Exception as e:
        print(f"Error launching casual mode: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/modes/outdoor", methods=["POST"])
def launch_outdoor_mode():
    """Launch Outdoor Mode GUI"""
    try:
        # Launch as a separate process
        script_path = os.path.join(os.path.dirname(__file__), 'outdoor_mode.py')
        process = subprocess.Popen([sys.executable, script_path], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        return jsonify({
            'status': 'launched', 
            'message': 'Outdoor Mode GUI launched',
            'mode': 'outdoor',
            'process_id': process.pid
        }), 200
    except Exception as e:
        print(f"Error launching outdoor mode: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route("/modes/list", methods=["GET"])
def list_available_modes():
    """List all available GUI modes"""
    return jsonify({
        'modes': [
            {
                'name': 'entertainment',
                'title': 'Entertainment Mode',
                'description': 'Interactive plant care games and challenges',
                'endpoint': '/modes/entertainment'
            },
            {
                'name': 'casual',
                'title': 'Casual Mode',
                'description': 'Simple plant care reminders and tips',
                'endpoint': '/modes/casual'
            },
            {
                'name': 'outdoor',
                'title': 'Outdoor Mode',
                'description': 'Advanced weather monitoring for outdoor plants',
                'endpoint': '/modes/outdoor'
            }
        ]
    }), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    
    # Start automatic monitoring when server starts
    print("🚀 Starting automatic monitoring system...")
    automatic_monitor.start_monitoring()
    
    app.run(host="0.0.0.0", port=port, debug=True)


